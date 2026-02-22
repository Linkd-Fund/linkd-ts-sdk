# Linkd TS SDK

A zero-liability, environment-agnostic utility layer for integrating with the Linkdfund Soroban Escrow primitive. This SDK abstracts Stellar's XDR serialization and RPC simulation into predictable, typed asynchronous methods.

> [!IMPORTANT]
> **Non-Custodial Regulatory Disclaimer**: This software is provided as a set of non-custodial protocol tools and interfaces. It does not provide financial services, investment advice, or asset management. All transaction signing and private key management are handled locally by the user. This implementation is designed to align with the **Kenyan VASP Act 2025** standards for non-custodial decentralized protocols.

## Architecture

* **Non-Custodial Execution:** The SDK does not handle private keys or sign transactions. All state-mutating methods return fully assembled XDR payloads intended for client-side cryptographic signing (e.g., Freighter, Albedo).
* **Resource Determinism:** Integrates native `SorobanRpc` simulation to calculate precise CPU, RAM, and ledger state footprints. This ensures accurate fee bidding and eliminates `op_no_footprint` network rejections prior to broadcasting.
* **Environment Agnostic:** Compiled to `ES2022` and `NodeNext`. Devoid of UI rendering primitives or browser-specific polyfills, ensuring native execution across Node.js servers, Edge computing environments, and AI agent containers.

## Installation

```bash
npm install linkd-ts-sdk
```

## Initialization

```typescript
import { LinkdSDK } from "linkd-ts-sdk";

const sdk = new LinkdSDK({
    network: "testnet",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org"
});
```

## Core Execution

### Read Operations (Simulated Views)

View functions execute strictly against the RPC simulation endpoint without mutating ledger state.

```typescript
const count = await sdk.escrow.getMilestoneCount("CONTRACT_ID");
const total = await sdk.escrow.getTotalEscrowed("CONTRACT_ID");
```

### Write Operations (XDR Assembly)

State-mutating functions construct the operation, simulate the transaction footprint, and return the required base64 XDR envelope.

```typescript
// Example: Submitting cryptographic proof for an escrow tranche
const xdrPayload = await sdk.escrow.submitProof(
    "CONTRACT_ID",
    "SOURCE_ADDRESS",
    0, // milestoneId
    "ipfs://Qm..." // proofHash
);

// The resulting xdrPayload must be signed by the SOURCE_ADDRESS 
// via a compliant wallet before submission to the network.
```

## Build Instructions

```bash
npm install
npm run build
```

## License

Proprietary. All rights reserved.
