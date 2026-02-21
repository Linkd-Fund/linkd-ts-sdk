import {
    Contract,
    TransactionBuilder,
    Asset,
    BASE_FEE,
    Account,
    xdr,
    SorobanRpc
} from "@stellar/stellar-sdk";
import { LinkdClient } from "./client.js";
import { LinkdUtils } from "./utils.js";

export interface InitEscrowParams {
    admin: string;
    ngo: string;
    auditor: string;
    beneficiary: string;
    tokenAddress: string;
    sourceAccount: string;
}

export interface LockDonationParams {
    donor: string;
    amount: number;
    contractId: string;
}

export class LinkdEscrow {
    constructor(private client: LinkdClient) { }

    /**
     * Prepares a transaction to initialize a new escrow contract.
     * Non-custodial: Returns the XDR string for the user to sign.
     */
    async initEscrow(params: InitEscrowParams): Promise<string> {
        const source = await this.client.horizon.loadAccount(params.sourceAccount);
        const contract = new Contract(params.tokenAddress); // Placeholder for WASM deployment logic or actual ID

        const operation = contract.call(
            "initialize",
            LinkdUtils.toScVal(params.admin, "address"),
            LinkdUtils.toScVal(params.ngo, "address"),
            LinkdUtils.toScVal(params.auditor, "address"),
            LinkdUtils.toScVal(params.beneficiary, "address"),
            LinkdUtils.toScVal(params.tokenAddress, "address")
        );

        const tx = new TransactionBuilder(new Account(source.id, source.sequence), {
            fee: BASE_FEE,
            networkPassphrase: this.client.networkPassphrase,
        })
            .addOperation(operation)
            .setTimeout(60)
            .build();

        return tx.toXDR();
    }

    /**
     * Prepares a transaction to lock a donation into an escrow.
     */
    async lockDonation(params: LockDonationParams): Promise<string> {
        const source = await this.client.horizon.loadAccount(params.donor);
        const contract = new Contract(params.contractId);

        const operation = contract.call(
            "deposit",
            LinkdUtils.toScVal(params.donor, "address"),
            LinkdUtils.toScVal(params.amount, "i128")
        );

        const tx = new TransactionBuilder(new Account(source.id, source.sequence), {
            fee: BASE_FEE,
            networkPassphrase: this.client.networkPassphrase,
        })
            .addOperation(operation)
            .setTimeout(60)
            .build();

        return tx.toXDR();
    }

    /**
     * Retrieves the status of an escrow contract.
     */
    async getEscrowStatus(contractId: string): Promise<{ totalEscrowed: number; milestoneCount: number }> {
        const contract = new Contract(contractId);

        const totalEscrowedOp = contract.call("get_total_escrowed");
        const milestoneCountOp = contract.call("get_milestone_count");

        const totalEscrowed = await this.simulateContractCall(totalEscrowedOp);
        const milestoneCount = await this.simulateContractCall(milestoneCountOp);

        return {
            totalEscrowed: LinkdUtils.fromScVal(totalEscrowed),
            milestoneCount: LinkdUtils.fromScVal(milestoneCount),
        };
    }

    private async simulateContractCall(operation: xdr.Operation): Promise<xdr.ScVal> {
        const rpc = new SorobanRpc.Server(this.client.sorobanRpcUrl);

        const account = await this.client.horizon.loadAccount(
            TransactionBuilder.fromXDR(
                new TransactionBuilder(new Account("GAAZIY4YI2Y5P773UCO2X4O3J5JAZDGY4WVRTH572PBWOT4GZ3YCQWGS", "0"), {
                    fee: BASE_FEE,
                    networkPassphrase: this.client.networkPassphrase,
                }).addOperation(operation).setTimeout(0).build().toXDR(),
                this.client.networkPassphrase
            ).source.id
        ).catch(() => new Account("GAAZIY4YI2Y5P773UCO2X4O3J5JAZDGY4WVRTH572PBWOT4GZ3YCQWGS", "0"));

        const tx = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: this.client.networkPassphrase,
        })
            .addOperation(operation)
            .setTimeout(60)
            .build();

        const simulated = await rpc.simulateTransaction(tx);

        if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
            return simulated.result!.retval;
        }

        throw new Error("Contract simulation failed");
    }
}
