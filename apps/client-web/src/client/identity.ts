import { ParcnetIdentityRPC } from "@parcnet-js/client-rpc";

export class ParcnetIdentityProcessor implements ParcnetIdentityRPC {
  async getSemaphoreV3Commitment(): Promise<bigint> {
    return BigInt(0);
  }
}
