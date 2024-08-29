import { ParcnetPODRPC, PODQuery } from "@parcnet/client-rpc";
import { POD } from "@pcd/pod";
import { GenericSerializedPodspecPOD, p } from "@pcd/podspec";
import { PODCollection } from "./pod_collection.js";

export class ParcnetPODServer implements ParcnetPODRPC {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async subscribe(_query: PODQuery): Promise<string> {
    throw new Error("Method not implemented.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async unsubscribe(_subscriptionId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
