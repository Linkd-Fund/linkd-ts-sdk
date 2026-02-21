# Linkd TS SDK
> Building the Infrastructure of Trust for the Global South using Rust and Soroban.

> [!IMPORTANT]
> **Non-Custodial Regulatory Disclaimer**: This software is provided as a set of non-custodial protocol tools and interfaces. It does not provide financial services, investment advice, or asset management. All transaction signing and private key management are handled locally by the user. This implementation is designed to align with the **Kenyan VASP Act 2025** standards for non-custodial decentralized protocols.

The `linkd-ts-sdk` is a high-level TypeScript library designed to abstract Stellar XDR complexity into simple, human-readable functions. It is strictly **non-custodial**, meaning it builds transactions for you to sign with your preferred wallet.

## Installation

```bash
npm install linkd-ts-sdk
```

## Setup

```typescript
import { LinkdSDK } from 'linkd-ts-sdk';

const sdk = new LinkdSDK({
  network: 'testnet'
});
```

## 1. Initialize an Escrow

Create a new "Truth Rail" for your cause.

```typescript
const xdr = await sdk.escrow.initEscrow({
  admin: "G...",         // Your Public Key
  ngo: "G...",           // NGO Public Key
  auditor: "G...",       // Auditor Public Key
  beneficiary: "G...",   // Target Public Key
  tokenAddress: "C...",  // SAC Asset Contract ID (USDC)
  sourceAccount: "G...", // Account paying the fee
});

// Now sign and submit this XDR using Freighter, Albedo, or a Secret Key
```

## 2. Lock a Donation

Donors can lock funds into a specific escrow.

```typescript
const xdr = await sdk.escrow.lockDonation({
  donor: "G...",
  amount: 1000,
  contractId: "C...", // The deployed Escrow Contract ID
});

// Sign and submit the XDR
```

## 3. Utility Helpers

```typescript
import { LinkdUtils } from 'linkd-ts-sdk';

const scVal = LinkdUtils.toScVal("G...", "address");
const nativeValue = LinkdUtils.fromScVal(scVal);
```

---
Built for Linkd Fund - Universal Truth Rail.
