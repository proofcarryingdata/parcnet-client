import type { PODData, PODQuery, ParcnetPODRPC } from "@parcnet-js/client-rpc";
import type { PODEntries } from "@pcd/pod";
import { POD, encodePrivateKey } from "@pcd/pod";
import type { Identity } from "@semaphore-protocol/core";
import type { PODCollection } from "./pod_collection.js";
import type { QuerySubscriptions } from "./query_subscriptions.js";

export class ParcnetPODProcessor implements ParcnetPODRPC {
  public constructor(
    private readonly pods: PODCollection,
    private readonly subscriptions: QuerySubscriptions,
    private readonly identity: Identity
  ) {}

  public async query(query: PODQuery): Promise<PODData[]> {
    return this.pods.query(query);
  }

  public async insert(podData: PODData): Promise<void> {
    this.pods.insert(podData);
  }

  public async delete(signature: string): Promise<void> {
    this.pods.delete(signature);
  }

  public async subscribe(query: PODQuery): Promise<string> {
    return this.subscriptions.subscribe(query);
  }

  public async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.unsubscribe(subscriptionId);
  }

  public async sign(entries: PODEntries): Promise<PODData> {
    /**
     * @todo: Once we have decided how to restrict this, we would implement
     * some security restrictions here.
     */
    const pod = POD.sign(
      entries,
      encodePrivateKey(Buffer.from(this.identity.export(), "base64"))
    );
    return {
      entries: pod.content.asEntries(),
      signature: pod.signature,
      signerPublicKey: pod.signerPublicKey
    };
  }
}
