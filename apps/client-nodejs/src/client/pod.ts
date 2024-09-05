import { ParcnetPODRPC, PODQuery } from "@parcnet/client-rpc";
import { POD } from "@pcd/pod";
import { PODCollection } from "./pod_collection.js";

export class ParcnetPODServer implements ParcnetPODRPC {
  public constructor(private readonly pods: PODCollection) {}

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
    return this.pods.subscribe(query);
  }

  public async unsubscribe(subscriptionId: string): Promise<void> {
    this.pods.unsubscribe(subscriptionId);
  }
}
