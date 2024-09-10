import {
  EntriesSchema,
  PODSchema,
  PodspecProofRequest
} from "@parcnet/podspec";
import { GPCBoundConfig, GPCProof, GPCRevealedClaims } from "@pcd/gpc";

/**
 * @file This file contains the RPC interfaces for the Parcnet client.
 *
 * These interfaces are implemented in rpc_client.ts.
 */

export type PODQuery<E extends EntriesSchema> = PODSchema<E>;

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
  query: <E extends EntriesSchema>(query: PODQuery<E>) => Promise<string[]>;
  insert: (serializedPod: string) => Promise<void>;
  delete: (signature: string) => Promise<void>;
  subscribe: <E extends EntriesSchema>(query: PODQuery<E>) => Promise<string>;
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
