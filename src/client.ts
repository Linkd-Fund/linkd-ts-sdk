import { Networks, rpc } from "@stellar/stellar-sdk";

export interface LinkdSDKConfig {
    network: "testnet" | "public";
    sorobanRpcUrl?: string;
}

export class LinkdClient {
    public readonly networkPassphrase: string;
    public readonly rpc: rpc.Server;

    constructor(config: LinkdSDKConfig) {
        const isTestnet = config.network === "testnet";
        const defaultSoroban = isTestnet
            ? "https://soroban-testnet.stellar.org"
            : "https://soroban-rpc.stellar.org";

        this.networkPassphrase = isTestnet ? Networks.TESTNET : Networks.PUBLIC;
        this.rpc = new rpc.Server(config.sorobanRpcUrl || defaultSoroban);
    }
}
