import { nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";

export class LinkdUtils {
    /**
     * Convert native JS values to Soroban SCVal
     */
    static toScVal(value: any, type?: string): xdr.ScVal {
        if (type === "address") {
            return nativeToScVal(value, { type: "address" });
        }
        if (type === "string") {
            return nativeToScVal(value, { type: "string" });
        }
        if (typeof value === "number" || type === "i128") {
            return nativeToScVal(value, { type: "i128" });
        }
        return nativeToScVal(value);
    }

    /**
     * Convert Soroban SCVal to native JS values
     */
    static fromScVal(scVal: xdr.ScVal): any {
        return scValToNative(scVal);
    }

    /**
     * Formats an amount to the correct precision (decimal 7 for Stellar)
     */
    static formatAmount(amount: number | string): string {
        return Number(amount).toFixed(7);
    }
}
