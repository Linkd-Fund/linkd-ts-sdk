import { createHash } from "crypto";
import {
    Keypair,
    TransactionBuilder,
    Account,
    Networks,
    Memo,
    BASE_FEE,
    Operation,
    Asset,
} from "@stellar/stellar-sdk";
import { Horizon } from "@stellar/stellar-sdk";

/**
 * Produces a deterministic SHA-256 hex digest for an expenditure record.
 * donorIds are sorted alphabetically before hashing to guarantee idempotency
 * regardless of the order callers supply them.
 */
export function generateExpenditureHash(
    invoiceNumber: string,
    amount: number,
    supplierName: string,
    donorIds: string[]
): string {
    const sortedDonorIds = [...donorIds].sort();
    const raw = `${invoiceNumber}|${amount}|${supplierName}|${sortedDonorIds.join(",")}`;
    return createHash("sha256").update(raw, "utf8").digest("hex");
}

/**
 * Anchors an expenditure hash to the Stellar ledger by embedding it as a
 * memo hash on a minimum-XLM self-payment transaction.
 * Returns the Stellar transaction hash (ledger proof).
 */
export async function anchorExpenditureToStellar(
    hashHex: string,
    sourceSecret: string,
    network: "testnet" | "public"
): Promise<string> {
    if (hashHex.length !== 64) {
        throw new Error("hashHex must be a 64-character SHA-256 hex string.");
    }

    const keypair = Keypair.fromSecret(sourceSecret);
    const sourcePublicKey = keypair.publicKey();

    const networkPassphrase = network === "testnet" ? Networks.TESTNET : Networks.PUBLIC;
    const horizonUrl =
        network === "testnet"
            ? "https://horizon-testnet.stellar.org"
            : "https://horizon.stellar.org";

    const server = new Horizon.Server(horizonUrl);
    const accountResponse = await server.loadAccount(sourcePublicKey);
    const account = new Account(sourcePublicKey, accountResponse.sequenceNumber());

    // Parse the 32-byte hash buffer for the memo.
    const hashBuffer = Buffer.from(hashHex, "hex");

    const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase,
    })
        .addOperation(
            Operation.payment({
                destination: sourcePublicKey,
                asset: Asset.native(),
                amount: "0.0000001", // minimum non-dust XLM
            })
        )
        .addMemo(Memo.hash(hashBuffer))
        .setTimeout(30)
        .build();

    tx.sign(keypair);

    const result = await server.submitTransaction(tx);
    return result.hash;
}
