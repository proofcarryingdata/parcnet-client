import type { PODData } from "@parcnet-js/client-rpc";
import { POD } from "@pcd/pod";
import { Identity } from "@semaphore-protocol/core";

export function loadPODsFromStorage(): POD[] {
  let pods: POD[] = [];
  const storedSerializedPODs = localStorage.getItem("pod_collection");
  if (!storedSerializedPODs) {
    return pods;
  }
  try {
    const serializedPODs = JSON.parse(storedSerializedPODs) as string[];
    pods = serializedPODs.map((str) => POD.deserialize(str));
  } catch (e) {
    // JSON parsing failed or POD deserialization failed
    console.error(e);
  }

  return pods;
}

export function savePODsToStorage(pods: POD[]): void {
  const serializedPODs = pods.map((pod) => pod.serialize());
  localStorage.setItem("pod_collection", JSON.stringify(serializedPODs));
}

export function getIdentity(): Identity {
  const serializedIdentity = localStorage.getItem("identity");

  let identity: Identity;
  if (!serializedIdentity) {
    identity = new Identity();
    localStorage.setItem("identity", identity.export());
  } else {
    identity = Identity.import(serializedIdentity);
  }

  return identity;
}

export function podToPODData(pod: POD): PODData {
  return {
    entries: pod.content.asEntries(),
    signature: pod.signature,
    signerPublicKey: pod.signerPublicKey
  };
}
