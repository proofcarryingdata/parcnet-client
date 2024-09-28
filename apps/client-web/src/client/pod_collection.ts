import type { PODData } from "@parcnet-js/client-rpc";
import * as p from "@parcnet-js/podspec";
import { POD } from "@pcd/pod";
import { EventEmitter } from "eventemitter3";

export interface PODCollectionUpdate {
  type: "insert" | "delete";
  affectedPOD: POD;
}

interface PODCollectionEvents {
  update: [update: PODCollectionUpdate];
}

export class PODCollection {
  private emitter = new EventEmitter<PODCollectionEvents>();

  constructor(private pods: POD[] = []) {}

  public insert(podData: PODData): void {
    const pod = POD.load(
      podData.entries,
      podData.signature,
      podData.signerPublicKey
    );
    this.pods.push(pod);
    this.emitter.emit("update", { type: "insert", affectedPOD: pod });
  }

  public delete(signature: string): void {
    let podToDelete: POD | undefined;
    const newCollection = this.pods.filter((pod) => {
      if (pod.signature === signature) {
        podToDelete = pod;
      }
      return pod.signature !== signature;
    });

    if (podToDelete) {
      this.pods = newCollection;
      this.emitter.emit("update", { type: "delete", affectedPOD: podToDelete });
    }
  }

  public query<E extends p.EntriesSchema>(query: p.PODSchema<E>): PODData[] {
    return p.pod(query).query(
      this.pods.map((pod) => ({
        entries: pod.content.asEntries(),
        signature: pod.signature,
        signerPublicKey: pod.signerPublicKey
      }))
    ).matches;
  }

  public onUpdate(listener: (update: PODCollectionUpdate) => void): void {
    this.emitter.addListener("update", listener);
  }

  public getAll(): POD[] {
    return this.pods;
  }
}
