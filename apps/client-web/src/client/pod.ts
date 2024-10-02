import {
  MissingPermissionError,
  type PODQuery,
  type ParcnetPODRPC,
  type Zapp
} from "@parcnet-js/client-rpc";
import type { PODEntries } from "@pcd/pod";
import { POD, encodePrivateKey } from "@pcd/pod";
import type { Identity } from "@semaphore-protocol/core";
import type { PODCollectionManager } from "./pod_collection_manager.js";
import type { QuerySubscriptions } from "./query_subscriptions.js";

export class ParcnetPODProcessor implements ParcnetPODRPC {
  public constructor(
    private readonly pods: PODCollectionManager,
    private readonly subscriptions: QuerySubscriptions,
    private readonly identity: Identity,
    private readonly zapp: Zapp
  ) {}

  public async query(collectionId: string, query: PODQuery): Promise<string[]> {
    const permission = this.zapp.permissions.READ_POD;
    if (!permission) {
      throw new MissingPermissionError("READ_POD", "pod.query");
    }
    if (!permission.collections.includes(collectionId)) {
      throw new MissingPermissionError("READ_POD", "pod.query");
    }

    return this.pods
      .get(collectionId)
      .query(query)
      .map((pod) => pod.serialize());
  }

  public async insert(
    collectionId: string,
    serializedPod: string
  ): Promise<void> {
    const permission = this.zapp.permissions.INSERT_POD;
    if (!permission) {
      throw new MissingPermissionError("INSERT_POD", "pod.insert");
    }
    if (!permission.collections.includes(collectionId)) {
      throw new MissingPermissionError("INSERT_POD", "pod.insert");
    }

    const pod = POD.deserialize(serializedPod);
    this.pods.get(collectionId).insert(pod);
  }

  public async delete(collectionId: string, signature: string): Promise<void> {
    const permission = this.zapp.permissions.DELETE_POD;
    if (!permission) {
      throw new MissingPermissionError("DELETE_POD", "pod.delete");
    }
    if (!permission.collections.includes(collectionId)) {
      throw new MissingPermissionError("DELETE_POD", "pod.delete");
    }

    this.pods.get(collectionId).delete(signature);
  }

  public async subscribe(
    collectionId: string,
    query: PODQuery
  ): Promise<string> {
    const permission = this.zapp.permissions.READ_POD;
    if (!permission) {
      throw new MissingPermissionError("READ_POD", "pod.query");
    }
    if (!permission.collections.includes(collectionId)) {
      throw new MissingPermissionError("READ_POD", "pod.query");
    }

    return this.subscriptions.subscribe(collectionId, query);
  }

  public async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.unsubscribe(subscriptionId);
  }

  public async sign(entries: PODEntries): Promise<string> {
    const permission = this.zapp.permissions.SIGN_POD;
    if (!permission) {
      throw new MissingPermissionError("SIGN_POD", "pod.sign");
    }

    const pod = POD.sign(
      entries,
      encodePrivateKey(Buffer.from(this.identity.export(), "base64"))
    );
    return pod.serialize();
  }
}
