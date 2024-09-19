import type { ParcnetIdentityRPC } from "@parcnet-js/client-rpc";
import { encodePublicKey } from "@pcd/pod";
import type { Identity } from "@semaphore-protocol/identity";

export class ParcnetIdentityProcessor implements ParcnetIdentityRPC {
  public constructor(private readonly v4Identity: Identity) {}

  async getSemaphoreV3Commitment(): Promise<bigint> {
    return BigInt(0);
  }
  async getSemaphoreV4Commitment(): Promise<bigint> {
    return this.v4Identity.commitment;
  }
  async getPublicKey(): Promise<string> {
    return encodePublicKey(this.v4Identity.publicKey);
  }
}
