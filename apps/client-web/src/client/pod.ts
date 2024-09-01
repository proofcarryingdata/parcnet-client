import { ParcnetPODRPC, PODQuery } from "@parcnet/client-rpc";
import { POD } from "@pcd/pod";
import { GenericSerializedPodspecPOD, p } from "@pcd/podspec";
import { PODCollection } from "./pod_collection.js";

export class ParcnetPODProcessor implements ParcnetPODRPC {
  public constructor(private readonly pods: PODCollection) {}

  public async query(query: GenericSerializedPodspecPOD): Promise<string[]> {
    const podspecQuery = p.deserialize(query);
    return this.pods.query(podspecQuery).map((pod) => pod.serialize());
  }

  public async insert(serializedPod: string): Promise<void> {
    const pod = POD.deserialize(serializedPod);
    this.pods.insert(pod);
  }

  public async delete(signature: string): Promise<void> {
    this.pods.delete(signature);
  }

  public async subscribe(query: PODQuery): Promise<string> {
    const q = p.deserialize(query);
    return this.pods.subscribe(q);
  }

  public async unsubscribe(subscriptionId: string): Promise<void> {
    this.pods.unsubscribe(subscriptionId);
  }
}
