import type {
  EntriesSchema,
  PODSchema,
  PodspecProofRequest
} from "@parcnet-js/podspec";
import type { GPCBoundConfig, GPCProof, GPCRevealedClaims } from "@pcd/gpc";
import type { PODEntries } from "@pcd/pod";
import type { PODData } from "./pod_data.js";

/**
 * @file This file contains the RPC interfaces for the Parcnet client.
 *
 * These interfaces are implemented in rpc_client.ts.
 */

export type PODQuery = PODSchema<EntriesSchema>;

export interface SubscriptionUpdateResult {
  subscriptionId: string;
  update: PODData[];
}

export interface GPCProofReturn {
  proof: GPCProof;
  boundConfig: GPCBoundConfig;
  revealedClaims: GPCRevealedClaims;
}

export type ProveResult =
  | ({
      success: true;
    } & GPCProofReturn)
  | {
      success: false;
      error: string;
    };

export interface ParcnetGPCRPC {
  prove: (request: PodspecProofRequest) => Promise<ProveResult>;
  canProve: (request: PodspecProofRequest) => Promise<boolean>;
  verify: (
    proof: GPCProof,
    boundConfig: GPCBoundConfig,
    revealedClaims: GPCRevealedClaims,
    proofRequest: PodspecProofRequest
  ) => Promise<boolean>;
}

export interface ParcnetIdentityRPC {
  getSemaphoreV3Commitment: () => Promise<bigint>;
  getSemaphoreV4Commitment: () => Promise<bigint>;
  getPublicKey: () => Promise<string>;
}

export interface ParcnetPODRPC {
  query: (query: PODQuery) => Promise<PODData[]>;
  insert: (podData: PODData) => Promise<void>;
  delete: (signature: string) => Promise<void>;
  subscribe: (query: PODQuery) => Promise<string>;
  unsubscribe: (subscriptionId: string) => Promise<void>;
  sign: (entries: PODEntries) => Promise<PODData>;
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
  ) => () => void;
}
