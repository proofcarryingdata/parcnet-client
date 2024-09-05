import { ParcnetPODRPC } from "@parcnet/client-rpc";
import * as p from "@parcnet/podspec";
import { EntriesSchema, PODSchema } from "@parcnet/podspec";
import { POD } from "@pcd/pod";
import { PODCollection } from "./pod_collection.js";
import { QuerySubscriptions } from "./query_subscriptions.js";

export class ParcnetPODProcessor implements ParcnetPODRPC {
  public constructor(
    private readonly pods: PODCollection,
    private readonly subscriptions: QuerySubscriptions
  ) {}

  public async query(query: PODSchema<EntriesSchema>): Promise<string[]> {
    return this.pods.query(p.pod(query)).map((pod) => pod.serialize());
  }

  public async insert(serializedPod: string): Promise<void> {
    const pod = POD.deserialize(serializedPod);
    this.pods.insert(pod);
  }

  public async delete(signature: string): Promise<void> {
    this.pods.delete(signature);
  }

  public async subscribe(query: PODSchema<EntriesSchema>): Promise<string> {
    return this.subscriptions.subscribe(p.pod(query));
  }

  public async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.unsubscribe(subscriptionId);
  }
}
