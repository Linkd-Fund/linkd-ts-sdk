import { nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";

export class LinkdUtils {
    static toScVal(value: any, type?: string): xdr.ScVal {
        if (type === "address") return nativeToScVal(value, { type: "address" });
        if (type === "string") return nativeToScVal(value, { type: "string" });
        if (typeof value === "number" || type === "i128") return nativeToScVal(value, { type: "i128" });
        return nativeToScVal(value);
    }

    static fromScVal(scVal: xdr.ScVal): any {
        return scValToNative(scVal);
    }

    static formatAmount(amount: number | string): string {
        return Number(amount).toFixed(7);
    }
}
