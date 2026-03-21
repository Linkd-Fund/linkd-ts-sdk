import { createHash, createHmac } from "crypto";
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
 * Anonymizes a raw donor ID using HMAC-SHA256 keyed on the campaign secret.
 *
 * Properties:
 *   - Deterministic: same donorId + same secret → same hash (idempotent per campaign).
 *   - Salted: different secrets → different hashes for the same donor ID.
 *     This prevents cross-campaign donor correlation without the campaign secret.
 *   - One-way: the raw donorId is not recoverable without the secret.
 *
 * @param donorId       Raw donor identifier (Supabase UUID or wallet address)
 * @param campaignSecret Per-campaign secret stored in campaigns.campaign_secret
 * @returns 64-character hex HMAC-SHA256 string
 */
export function anonymizeDonorId(donorId: string, campaignSecret: string): string {
    return createHmac("sha256", campaignSecret)
        .update(donorId, "utf8")
        .digest("hex");
}

/**
 * Produces a deterministic SHA-256 hex digest for an expenditure record.
 *
 * CALLER CONTRACT: `anonymizedDonorIds` must be pre-anonymized via `anonymizeDonorId`.
 * Never pass raw donor UUIDs — the hash will be on-chain and publicly readable.
 *
 * IDs are sorted alphabetically before hashing to guarantee idempotency
 * regardless of the order callers supply them.
 */
export function generateExpenditureHash(
    invoiceNumber: string,
    amount: number,
    supplierName: string,
    anonymizedDonorIds: string[]
): string {
    const sorted = [...anonymizedDonorIds].sort();
    const raw = `${invoiceNumber}|${amount}|${supplierName}|${sorted.join(",")}`;
    return createHash("sha256").update(raw, "utf8").digest("hex");
}

/**
 * Convenience function: anonymizes raw donor IDs with the campaign secret,
 * then produces the deterministic expenditure bundle hash.
 *
 * Use this at the call site so raw donor IDs never appear in the hash input.
 *
 * @param invoiceNumber  KRA eTIMS invoice number
 * @param amount         Expenditure amount in KES
 * @param supplierName   Supplier / vendor name
 * @param donorIds       Raw donor identifiers (anonymized internally)
 * @param campaignSecret Per-campaign HMAC key from campaigns.campaign_secret
 * @returns 64-character hex SHA-256 bundle hash
 */
export function generateAnonymizedExpenditureHash(
    invoiceNumber: string,
    amount: number,
    supplierName: string,
    donorIds: string[],
    campaignSecret: string
): string {
    const anonymizedDonorIds = donorIds.map((id) => anonymizeDonorId(id, campaignSecret));
    return generateExpenditureHash(invoiceNumber, amount, supplierName, anonymizedDonorIds);
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
