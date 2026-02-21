export * from "./client.js";
export * from "./escrow.js";
export * from "./utils.js";

import { LinkdClient } from "./client.js";
import type { LinkdSDKConfig } from "./client.js";
import { LinkdEscrow } from "./escrow.js";

export class LinkdSDK {
    public readonly client: LinkdClient;
    public readonly escrow: LinkdEscrow;

    constructor(config: LinkdSDKConfig) {
        this.client = new LinkdClient(config);
        this.escrow = new LinkdEscrow(this.client);
    }
}
