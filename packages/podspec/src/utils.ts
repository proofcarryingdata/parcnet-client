import type { POD } from "@pcd/pod";
import type { PODData } from "./parse/pod.js";

export function deepFreeze<T extends object>(obj: T): T {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  Object.freeze(obj);

  Object.values(obj).forEach((value) => {
    deepFreeze(value);
  });

  return obj;
}

export function podToPODData(pod: POD): PODData {
  return {
    entries: pod.content.asEntries(),
    signature: pod.signature,
    signerPublicKey: pod.signerPublicKey
  };
}
