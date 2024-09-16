import { PODQuery, ParcnetPODRPC } from "@parcnet-js/client-rpc";
import { POD, PODEntries, encodePrivateKey } from "@pcd/pod";
import { Identity } from "@semaphore-protocol/identity";
import { PODCollection } from "./pod_collection.js";
import { QuerySubscriptions } from "./query_subscriptions.js";

export class ParcnetPODProcessor implements ParcnetPODRPC {
  public constructor(
    private readonly pods: PODCollection,
    private readonly subscriptions: QuerySubscriptions,
    private readonly identity: Identity
  ) {}

  public async query(query: PODQuery): Promise<string[]> {
    return this.pods.query(query).map((pod) => pod.serialize());
  }

  public async insert(serializedPod: string): Promise<void> {
    const pod = POD.deserialize(serializedPod);
    this.pods.insert(pod);
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

  public async sign(entries: PODEntries): Promise<string> {
    /**
     * @todo: Once we have decided how to restrict this, we would implement
     * some security restrictions here.
     */
    const pod = POD.sign(
      entries,
      encodePrivateKey(Buffer.from(this.identity.export(), "base64"))
    );
    return pod.serialize();
  }
}
