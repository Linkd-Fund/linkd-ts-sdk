/**
 * FAILING TEST — Phase 1.4: Anonymized Expenditure Hashing
 *
 * This test FAILS before `anonymizeDonorId` and `generateAnonymizedExpenditureHash`
 * are exported from anchoring/index.ts.
 *
 * Core invariant being proved:
 *   The same raw donor list hashed with DIFFERENT campaign secrets must produce
 *   DIFFERENT bundle hashes. Without this property, cross-campaign donor
 *   correlation attacks become trivial.
 */

import { describe, it, expect } from "vitest";
import { anonymizeDonorId, generateAnonymizedExpenditureHash } from "./index.js";

const DONOR_IDS = ["donor-aaa", "donor-bbb", "donor-ccc"];
const INVOICE = "INV-2024-001";
const AMOUNT = 5000;
const SUPPLIER = "Nairobi General Hospital";

describe("anonymizeDonorId", () => {
    it("produces different outputs for the same donorId with different campaign secrets", () => {
        const hmac1 = anonymizeDonorId("donor-aaa", "campaign-secret-alpha");
        const hmac2 = anonymizeDonorId("donor-aaa", "campaign-secret-beta");
        expect(hmac1).not.toBe(hmac2);
    });

    it("is deterministic — same inputs always produce the same output", () => {
        const a = anonymizeDonorId("donor-aaa", "secret-x");
        const b = anonymizeDonorId("donor-aaa", "secret-x");
        expect(a).toBe(b);
    });

    it("produces a 64-character hex string (SHA-256 HMAC)", () => {
        const result = anonymizeDonorId("donor-aaa", "any-secret");
        expect(result).toHaveLength(64);
        expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it("different donorIds with the same secret produce different outputs", () => {
        const a = anonymizeDonorId("donor-aaa", "shared-secret");
        const b = anonymizeDonorId("donor-bbb", "shared-secret");
        expect(a).not.toBe(b);
    });
});

describe("generateAnonymizedExpenditureHash", () => {
    it("same donors + different campaign secrets produce different bundle hashes", () => {
        // This is the canonical proof that salt isolation works.
        // If these hashes were equal, donors could be linked across campaigns.
        const hashA = generateAnonymizedExpenditureHash(
            INVOICE,
            AMOUNT,
            SUPPLIER,
            DONOR_IDS,
            "campaign-secret-alpha"
        );
        const hashB = generateAnonymizedExpenditureHash(
            INVOICE,
            AMOUNT,
            SUPPLIER,
            DONOR_IDS,
            "campaign-secret-beta"
        );
        expect(hashA).not.toBe(hashB);
    });

    it("is deterministic — same inputs always produce the same hash", () => {
        const a = generateAnonymizedExpenditureHash(
            INVOICE, AMOUNT, SUPPLIER, DONOR_IDS, "stable-secret"
        );
        const b = generateAnonymizedExpenditureHash(
            INVOICE, AMOUNT, SUPPLIER, DONOR_IDS, "stable-secret"
        );
        expect(a).toBe(b);
    });

    it("is order-independent — donor list order does not change the hash", () => {
        const sorted = generateAnonymizedExpenditureHash(
            INVOICE, AMOUNT, SUPPLIER,
            ["donor-aaa", "donor-bbb", "donor-ccc"],
            "secret"
        );
        const reversed = generateAnonymizedExpenditureHash(
            INVOICE, AMOUNT, SUPPLIER,
            ["donor-ccc", "donor-bbb", "donor-aaa"],
            "secret"
        );
        expect(sorted).toBe(reversed);
    });

    it("produces a 64-character hex string", () => {
        const h = generateAnonymizedExpenditureHash(
            INVOICE, AMOUNT, SUPPLIER, DONOR_IDS, "any-secret"
        );
        expect(h).toHaveLength(64);
        expect(h).toMatch(/^[0-9a-f]{64}$/);
    });
});
