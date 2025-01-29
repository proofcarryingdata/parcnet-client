import type {
  PodspecProofRequestSchema,
  ProofConfigPODSchema,
  ProofRequest,
  ProofRequestSpec
} from "./gpc/proof_request.js";
import { proofRequest } from "./gpc/proof_request.js";
import type { EntriesSpec } from "./parse/entries.js";
import { entries } from "./parse/entries.js";
import type { PODData, PodSpec } from "./parse/pod.js";
import { pod, merge } from "./parse/pod.js";

export {
  entries,
  pod,
  proofRequest,
  merge,
  type EntriesSpec,
  type ProofConfigPODSchema,
  type PodSpec,
  type PODData,
  type PodspecProofRequestSchema as PodspecProofRequest,
  type ProofRequest,
  type ProofRequestSpec
};
