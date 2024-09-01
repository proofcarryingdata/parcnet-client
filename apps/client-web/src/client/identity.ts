import { ParcnetIdentityRPC } from "@parcnet/client-rpc";

export class ParcnetIdentityProcessor implements ParcnetIdentityRPC {
  public constructor() {}

  async getSemaphoreV3Commitment(): Promise<bigint> {
    return BigInt(0);
  }
}
