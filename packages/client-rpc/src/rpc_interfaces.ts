import { PODSchema, PodspecProofRequest } from "@parcnet/podspec";
import { GPCBoundConfig, GPCProof, GPCRevealedClaims } from "@pcd/gpc";

/**
 * @file This file contains the RPC interfaces for the Parcnet client.
 *
 * These interfaces are implemented in rpc_client.ts.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PODQuery = PODSchema<any>;

export interface SubscriptionUpdateResult {
  subscriptionId: string;
  update: string[];
}

export type ProveResult =
  | {
      success: true;
      proof: GPCProof;
      boundConfig: GPCBoundConfig;
      revealedClaims: GPCRevealedClaims;
    }
  | {
      success: false;
      error: string;
    };

export interface ParcnetGPCRPC {
  prove: (request: PodspecProofRequest) => Promise<ProveResult>;
  canProve: (request: PodspecProofRequest) => Promise<boolean>;
  verify: (
    proof: GPCProof,
    revealedClaims: GPCRevealedClaims,
    proofRequest: PodspecProofRequest
  ) => Promise<boolean>;
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
