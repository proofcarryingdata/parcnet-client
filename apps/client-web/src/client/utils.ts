import { POD } from "@pcd/pod";
import { Identity } from "@semaphore-protocol/core";
import * as v from "valibot";
import { PODCollection } from "./pod_collection";

export function loadPODsFromStorage(): Record<string, PODCollection> {
  const result: Record<string, PODCollection> = {};
  const storedSerializedPODs = localStorage.getItem("pod_collections");
  if (!storedSerializedPODs) {
    return result;
  }
  try {
    const serializedCollections = JSON.parse(storedSerializedPODs) as unknown;
    const parsed = v.parse(
      v.record(v.string(), v.array(v.any())),
      serializedCollections
    );
    for (const [collectionId, serializedPODs] of Object.entries(parsed)) {
      result[collectionId] = new PODCollection(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        serializedPODs.map((obj) => POD.fromJSON(obj))
      );
    }
  } catch (e) {
    // JSON parsing failed or POD deserialization failed
    console.error(e);
  }

  return result;
}

export function savePODsToStorage(
  collections: Record<string, PODCollection>
): void {
  const serializedCollections = Object.fromEntries(
    Object.entries(collections).map(([collectionId, collection]) => [
      collectionId,
      collection.getAll().map((pod) => pod.toJSON())
    ])
  );
  localStorage.setItem(
    "pod_collections",
    JSON.stringify(serializedCollections)
  );
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
