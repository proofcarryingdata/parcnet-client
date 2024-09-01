import type { GPCPCDArgs } from "@pcd/gpc-pcd";
import type { SerializedPCD } from "@pcd/pcd-types";
import { GenericSerializedPodspecPOD } from "@pcd/podspec";

/**
 * @file This file contains the RPC interfaces for the Parcnet client.
 *
 * These interfaces are implemented in rpc_client.ts.
 */

export type PODQuery = GenericSerializedPodspecPOD;

export interface SubscriptionUpdateResult {
  subscriptionId: string;
  update: string[];
}

export interface ParcnetGPCRPC {
  prove: (args: GPCPCDArgs) => Promise<SerializedPCD>;
  verify: (pcd: SerializedPCD) => Promise<boolean>;
}

export interface ParcnetIdentityRPC {
  getSemaphoreV3Commitment: () => Promise<bigint>;
}

export interface ParcnetPODRPC {
  // Returns array of serialized PODs
  query: (query: PODQuery) => Promise<string[]>;
  insert: (serializedPod: string) => Promise<void>;
  delete: (signature: string) => Promise<void>;
  subscribe: (query: PODQuery) => Promise<string>;
  unsubscribe: (subscriptionId: string) => Promise<void>;
}

export interface ParcnetRPC {
  _version: "1";
  gpc: ParcnetGPCRPC;
  identity: ParcnetIdentityRPC;
  pod: ParcnetPODRPC;
}

export interface ParcnetEvents {
  on: (
    event: "subscription-update",
    callback: (result: SubscriptionUpdateResult) => void
  ) => void;
}
