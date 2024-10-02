import type { POD } from "@pcd/pod";
import type { PODData } from "./parse/pod.js";

export function podToPODData(pod: POD): PODData {
  return {
    entries: pod.content.asEntries(),
    signature: pod.signature,
    signerPublicKey: pod.signerPublicKey
  };
}
