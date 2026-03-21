# linkd-ts-sdk

TypeScript — non-custodial Soroban XDR builder and Stellar anchoring utilities for the Linkdfund protocol.

> [!IMPORTANT]
> **Non-Custodial Regulatory Disclaimer**: This software is provided as a set of non-custodial protocol tools and interfaces. It does not provide financial services, investment advice, or asset management. All transaction signing and private key management are handled locally by the user. This implementation is designed to align with the **Kenyan VASP Act 2025** standards for non-custodial decentralized protocols.

## What This Is

The integration layer between `linkd-app` and the Stellar network. It:

1. Constructs Soroban contract operations and returns base64 XDR envelopes for external signing.
2. Simulates operations via SorobanRpc to compute deterministic fees.
3. Generates anonymized expenditure bundle hashes (SHA-256).
4. Anchors expenditure hashes to Stellar via `Memo.hash`.

**It never holds private keys. It never submits transactions. It produces XDR.**

## Installation

This package is not published to npm. It is consumed as a local file dependency:

```json
// linkd-app/package.json
{
  "dependencies": {
    "linkd-ts-sdk": "file:../linkd-ts-sdk"
  }
}
```

Build before consuming:

```bash
cd linkd-ts-sdk && npm run build
```

## Source Structure

```
src/
  client.ts      LinkdClient — RPC connection, network passphrase
  escrow.ts      LinkdEscrow — contract operation builders (all return XDR)
  utils.ts       LinkdUtils — ScVal conversion, amount formatting
  anchoring/     generateExpenditureHash(), generateAnonymizedExpenditureHash(),
                 anonymizeDonorId(), anchorExpenditureToStellar()
  index.ts       Exports
```

## Initialization

```typescript
import { LinkdSDK } from 'linkd-ts-sdk'

const sdk = new LinkdSDK({
  network: 'testnet',
  sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
})
```

## Escrow Operations (XDR Assembly)

All write operations construct the operation, simulate the transaction footprint, and return a base64 XDR envelope. The XDR must be signed externally (Freighter, Albedo, or server keypair) before submission.

```typescript
// Initialize escrow
const xdr = await sdk.escrow.initEscrow(contractId, sourceAddress, {
  admin, ngo, auditor, beneficiary, token,
})

// Add a funding milestone (Admin)
const xdr = await sdk.escrow.addMilestone(contractId, sourceAddress, {
  milestoneId, targetAmount, description,
})

// Lock donor funds
const xdr = await sdk.escrow.depositFunds(contractId, sourceAddress, {
  donor, amount,
})

// Submit KRA/IPFS proof hash (NGO)
const xdr = await sdk.escrow.submitProof(contractId, sourceAddress, {
  milestoneId, proofHash,
})

// Dual-signature approval
const xdr = await sdk.escrow.approveNgo(contractId, sourceAddress, { milestoneId })
const xdr = await sdk.escrow.approveAuditor(contractId, sourceAddress, { milestoneId })

// Administrative refund
const xdr = await sdk.escrow.refundMilestone(contractId, sourceAddress, {
  milestoneId, refundAddress,
})
```

## Read Operations (Simulated Views)

View functions execute against the RPC simulation endpoint without mutating ledger state.

```typescript
const count = await sdk.escrow.getMilestoneCount(contractId)
const total = await sdk.escrow.getTotalEscrowed(contractId)
const status = await sdk.escrow.getEscrowStatus(contractId)
```

## Anchoring Module

### Expenditure Hash (Anonymized)

Donor privacy is enforced at the hash level. Raw donor IDs are never embedded on-chain.

```typescript
import {
  anonymizeDonorId,
  generateAnonymizedExpenditureHash,
  generateExpenditureHash,
  anchorExpenditureToStellar,
} from 'linkd-ts-sdk'

// Anonymize individual donor IDs before hashing
const anonId = anonymizeDonorId(donorId)  // HMAC-SHA256 with DATABASE_ENCRYPTION_KEY

// Generate expenditure bundle hash using anonymized IDs
const hashHex = generateAnonymizedExpenditureHash(
  { invoice_number, amount, supplier_name },
  donorIds   // raw IDs — anonymized internally before hashing
)

// Anchor to Stellar via Memo.hash
const stellarTxHash = await anchorExpenditureToStellar(hashHex)
```

> **Warning**: `generateExpenditureHash()` accepts pre-anonymized donor IDs and is used internally. Always call `generateAnonymizedExpenditureHash()` from `linkd-app` — never pass raw donor UUIDs to `generateExpenditureHash()` directly. Doing so produces a different hash than the one anchored on-chain (tamper-evidence break).

### Hash Determinism

- Donor ID order does not affect the hash — IDs are sorted internally before hashing.
- Same inputs always produce the same hash — idempotent across retry runs.

## ScVal Conversion

```typescript
// JS value → Soroban XDR ScVal
LinkdUtils.toScVal(value, type?)

// Soroban XDR ScVal → JS value
LinkdUtils.fromScVal(scVal)
```

Supported types: `'string' | 'u32' | 'i128' | 'address' | 'bool'`

For amounts: always use `i128` (Soroban token standard). Do not use `u64`.

## Network Config

```typescript
const TESTNET = {
  networkPassphrase: 'Test SDF Network ; September 2015',
  rpcUrl: 'https://soroban-testnet.stellar.org',
}
const MAINNET = {
  networkPassphrase: 'Public Global Stellar Network ; September 2015',
  rpcUrl: 'https://soroban-rpc.stellar.org',
}
```

Network is set via `STELLAR_NETWORK` env var in `linkd-app`. Never hardcode.

## Build

```bash
npm run build    # Compiles to dist/ — must run after changes before linkd-app can consume
npm test         # Vitest
```

## Dependency Note

`@stellar/stellar-sdk ^13.3.0` — Stellar SDK has breaking changes between minor versions. Before running `npm update`, check the changelog at https://github.com/stellar/js-stellar-sdk/blob/master/CHANGELOG.md.

## License

Proprietary. All rights reserved.
