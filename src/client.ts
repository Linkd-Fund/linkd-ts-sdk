import { Horizon, Networks } from "@stellar/stellar-sdk";

export interface LinkdSDKConfig {
    network: "testnet" | "public";
    horizonUrl?: string;
    sorobanRpcUrl?: string;
}

export class LinkdClient {
    public readonly horizon: Horizon.Server;
    public readonly networkPassphrase: string;
    public readonly sorobanRpcUrl: string;

    constructor(config: LinkdSDKConfig) {
        const isTestnet = config.network === "testnet";
        const defaultHorizon = isTestnet
            ? "https://horizon-testnet.stellar.org"
            : "https://horizon.stellar.org";
        const defaultSoroban = isTestnet
            ? "https://soroban-testnet.stellar.org"
            : "https://soroban-rpc.stellar.org"; // Note: Public RPC URL might vary

        this.horizon = new Horizon.Server(config.horizonUrl || defaultHorizon);
        this.networkPassphrase = isTestnet ? Networks.TESTNET : Networks.PUBLIC;
        this.sorobanRpcUrl = config.sorobanRpcUrl || defaultSoroban;
    }
}
