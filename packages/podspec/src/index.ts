import type {
  PodspecProofRequestSchema,
  ProofConfigPODSchema,
  ProofRequest,
  ProofRequestSpec
} from "./gpc/proof_request.js";
import { proofRequest } from "./gpc/proof_request.js";
import type { EntriesSpec } from "./parse/entries.js";
import { entries } from "./parse/entries.js";
import type { PodSpec } from "./parse/pod.js";
import { pod } from "./parse/pod.js";
import type { EntriesSchema } from "./schemas/entries.js";
import type { PODSchema } from "./schemas/pod.js";
import type {
  EntriesOutputType,
  InferEntriesType,
  InferJavaScriptEntriesType,
  InferPodType
} from "./type_inference.js";

export {
  entries,
  pod,
  proofRequest,
  type EntriesOutputType,
  type EntriesSchema,
  type EntriesSpec,
  type InferJavaScriptEntriesType,
  type InferEntriesType,
  type InferPodType,
  type ProofConfigPODSchema,
  type PODSchema,
  type PodSpec,
  type PodspecProofRequestSchema as PodspecProofRequest,
  type ProofRequest,
  type ProofRequestSpec
};
