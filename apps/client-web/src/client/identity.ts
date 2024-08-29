import { ParcnetIdentityRPC } from "@parcnet/client-rpc";

export class ParcnetIdentityServer implements ParcnetIdentityRPC {
  public constructor() {}

  async getSemaphoreV3Commitment(): Promise<bigint> {
    return BigInt(0);
  }
}
