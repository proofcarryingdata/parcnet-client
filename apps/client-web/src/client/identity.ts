import {
  MissingPermissionError,
  type ParcnetIdentityRPC,
  type Zapp
} from "@parcnet-js/client-rpc";
import { encodePublicKey } from "@pcd/pod";
import type { Identity } from "@semaphore-protocol/core";

export class ParcnetIdentityProcessor implements ParcnetIdentityRPC {
  public constructor(
    private readonly v4Identity: Identity,
    private readonly zapp: Zapp
  ) {}

  async getSemaphoreV3Commitment(): Promise<bigint> {
    const permission = this.zapp.permissions.READ_PUBLIC_IDENTIFIERS;
    if (!permission) {
      throw new MissingPermissionError(
        "READ_PUBLIC_IDENTIFIERS",
        "identity.getPublicKey"
      );
    }

    return BigInt(0);
  }

  async getSemaphoreV4Commitment(): Promise<bigint> {
    const permission = this.zapp.permissions.READ_PUBLIC_IDENTIFIERS;
    if (!permission) {
      throw new MissingPermissionError(
        "READ_PUBLIC_IDENTIFIERS",
        "identity.getPublicKey"
      );
    }

    return this.v4Identity.commitment;
  }

  async getPublicKey(): Promise<string> {
    const permission = this.zapp.permissions.READ_PUBLIC_IDENTIFIERS;
    if (!permission) {
      throw new MissingPermissionError(
        "READ_PUBLIC_IDENTIFIERS",
        "identity.getPublicKey"
      );
    }

    return encodePublicKey(this.v4Identity.publicKey);
  }
}
