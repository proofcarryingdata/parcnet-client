import { POD } from "@pcd/pod";

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
