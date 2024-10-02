import type {
  EntriesSchema,
  PODSchema,
  PodspecProofRequest
} from "@parcnet-js/podspec";
import type { GPCBoundConfig, GPCProof, GPCRevealedClaims } from "@pcd/gpc";
import type { PODEntries } from "@pcd/pod";

/**
 * @file This file contains the RPC interfaces for the Parcnet client.
 *
 * These interfaces are implemented in rpc_client.ts.
 */

export type PODQuery = PODSchema<EntriesSchema>;

export interface SubscriptionUpdateResult {
  subscriptionId: string;
  update: string[];
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
  prove: ({
    request,
    collectionIds
  }: {
    request: PodspecProofRequest;
    collectionIds?: string[];
  }) => Promise<ProveResult>;
  canProve: ({
    request,
    collectionIds
  }: {
    request: PodspecProofRequest;
    collectionIds?: string[];
  }) => Promise<boolean>;
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
  // Returns array of serialized PODs
  query: (collectionId: string, query: PODQuery) => Promise<string[]>;
  insert: (collectionId: string, serializedPod: string) => Promise<void>;
  delete: (collectionId: string, signature: string) => Promise<void>;
  subscribe: (collectionId: string, query: PODQuery) => Promise<string>;
  unsubscribe: (subscriptionId: string) => Promise<void>;
  // Returns serialized POD
  sign: (entries: PODEntries) => Promise<string>;
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
