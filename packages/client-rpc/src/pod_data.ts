import type { PODEntries } from "@pcd/pod";

export interface PODData {
  entries: PODEntries;
  signature: string;
  signerPublicKey: string;
}
