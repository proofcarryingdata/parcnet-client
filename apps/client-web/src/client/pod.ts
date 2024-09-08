import { ParcnetPODRPC, ParcnetRPCSchema } from "@parcnet/client-rpc";
import * as p from "@parcnet/podspec";
import { EntriesSchema, PODSchema } from "@parcnet/podspec";
import { POD } from "@pcd/pod";
import { PODCollection } from "./pod_collection.js";
import { QuerySubscriptions } from "./query_subscriptions.js";
import { validateInput } from "./utils.js";

export class ParcnetPODProcessor implements ParcnetPODRPC {
  public constructor(
    private readonly pods: PODCollection,
    private readonly subscriptions: QuerySubscriptions
  ) {}

  @validateInput(ParcnetRPCSchema.shape.pod.shape.query)
  public async query(query: PODSchema<EntriesSchema>): Promise<string[]> {
    return this.pods.query(p.pod(query)).map((pod) => pod.serialize());
  }

  @validateInput(ParcnetRPCSchema.shape.pod.shape.insert)
  public async insert(serializedPod: string): Promise<void> {
    const pod = POD.deserialize(serializedPod);
    this.pods.insert(pod);
  }

  @validateInput(ParcnetRPCSchema.shape.pod.shape.delete)
  public async delete(signature: string): Promise<void> {
    this.pods.delete(signature);
  }

  @validateInput(ParcnetRPCSchema.shape.pod.shape.subscribe)
  public async subscribe(query: PODSchema<EntriesSchema>): Promise<string> {
    return this.subscriptions.subscribe(p.pod(query));
  }

  @validateInput(ParcnetRPCSchema.shape.pod.shape.unsubscribe)
  public async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.unsubscribe(subscriptionId);
  }
}
