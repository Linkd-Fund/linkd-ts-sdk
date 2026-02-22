import {
    Contract,
    TransactionBuilder,
    Account,
    xdr,
    rpc,
    BASE_FEE,
    TimeoutInfinite
} from "@stellar/stellar-sdk";
import { LinkdClient } from "./client.js";
import { LinkdUtils } from "./utils.js";

export class LinkdEscrow {
    constructor(private client: LinkdClient) { }

    /**
     * Core Simulation Pipeline.
     * Takes a raw operation, simulates it against the network, attaches the correct 
     * resource footprints, and returns the assembled XDR ready for client signing.
     */
    private async buildAndSimulate(sourceAddress: string, operation: xdr.Operation): Promise<string> {
        // Fetch real account sequence from Soroban RPC
        const accountReq = await this.client.rpc.getAccount(sourceAddress);
        const account = new Account(sourceAddress, accountReq.sequenceNumber());

        const tx = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: this.client.networkPassphrase,
        })
            .addOperation(operation)
            .setTimeout(300) // 5 minutes to sign and submit
            .build();

        const simulated = await this.client.rpc.simulateTransaction(tx);

        if (rpc.Api.isSimulationError(simulated)) {
            throw new Error(`Simulation failed: ${simulated.error}`);
        }

        // Assemble the final transaction with the calculated footprint and fee
        const assembledTx = rpc.assembleTransaction(tx, simulated);
        return assembledTx.build().toXDR();
    }

    /**
     * Read-only simulation pipeline for view functions.
     */
    private async simulateView(contractId: string, method: string, args: xdr.ScVal[] = []): Promise<any> {
        const contract = new Contract(contractId);
        const tx = new TransactionBuilder(new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0"), {
            fee: BASE_FEE,
            networkPassphrase: this.client.networkPassphrase,
        }).addOperation(contract.call(method, ...args)).setTimeout(TimeoutInfinite).build();

        const simulated = await this.client.rpc.simulateTransaction(tx);
        if (rpc.Api.isSimulationSuccess(simulated) && simulated.result) {
            return LinkdUtils.fromScVal(simulated.result.retval);
        }
        throw new Error(`View simulation failed for ${method}`);
    }

    // --- WRITE OPERATIONS (Returns XDR for signing) ---

    async initialize(contractId: string, admin: string, ngo: string, auditor: string, beneficiary: string, tokenAddress: string): Promise<string> {
        const contract = new Contract(contractId);
        const op = contract.call(
            "initialize",
            LinkdUtils.toScVal(admin, "address"),
            LinkdUtils.toScVal(ngo, "address"),
            LinkdUtils.toScVal(auditor, "address"),
            LinkdUtils.toScVal(beneficiary, "address"),
            LinkdUtils.toScVal(tokenAddress, "address")
        );
        return this.buildAndSimulate(admin, op);
    }

    async addMilestone(contractId: string, admin: string, targetAmount: number): Promise<string> {
        const contract = new Contract(contractId);
        const op = contract.call("add_milestone", LinkdUtils.toScVal(targetAmount, "i128"));
        return this.buildAndSimulate(admin, op);
    }

    async deposit(contractId: string, donor: string, amount: number): Promise<string> {
        const contract = new Contract(contractId);
        const op = contract.call("deposit", LinkdUtils.toScVal(donor, "address"), LinkdUtils.toScVal(amount, "i128"));
        return this.buildAndSimulate(donor, op);
    }

    async submitProof(contractId: string, ngo: string, milestoneId: number, proofHash: string): Promise<string> {
        const contract = new Contract(contractId);
        const op = contract.call(
            "submit_proof",
            LinkdUtils.toScVal(milestoneId, "u32"),
            LinkdUtils.toScVal(proofHash, "string") // Uses String as updated in smart contract
        );
        return this.buildAndSimulate(ngo, op);
    }

    async approveNgo(contractId: string, ngo: string, milestoneId: number): Promise<string> {
        const contract = new Contract(contractId);
        const op = contract.call("approve_ngo", LinkdUtils.toScVal(milestoneId, "u32"));
        return this.buildAndSimulate(ngo, op);
    }

    async approveAuditor(contractId: string, auditor: string, milestoneId: number): Promise<string> {
        const contract = new Contract(contractId);
        const op = contract.call("approve_auditor", LinkdUtils.toScVal(milestoneId, "u32"));
        return this.buildAndSimulate(auditor, op);
    }

    async refundMilestone(contractId: string, admin: string, milestoneId: number, refundAddress: string): Promise<string> {
        const contract = new Contract(contractId);
        const op = contract.call(
            "refund_milestone",
            LinkdUtils.toScVal(milestoneId, "u32"),
            LinkdUtils.toScVal(refundAddress, "address")
        );
        return this.buildAndSimulate(admin, op);
    }

    // --- READ OPERATIONS (Returns immediate data) ---

    async getTotalEscrowed(contractId: string): Promise<string> {
        return await this.simulateView(contractId, "get_total_escrowed");
    }

    async getMilestoneCount(contractId: string): Promise<number> {
        return await this.simulateView(contractId, "get_milestone_count");
    }
}
