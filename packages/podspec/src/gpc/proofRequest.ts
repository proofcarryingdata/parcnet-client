import type {
  GPCProofConfig,
  GPCProofEntryConfig,
  GPCProofObjectConfig,
  GPCProofTupleConfig,
  PODEntryIdentifier,
  PODMembershipLists
} from "@pcd/gpc";
import { POD, PODName, PODValue } from "@pcd/pod";
import { PodSpec } from "../parse/pod";
import { EntriesSchema } from "../schemas/entries";
import { PODSchema } from "../schemas/pod";

export type ProofRequest = {
  proofConfig: GPCProofConfig;
  membershipLists: PODMembershipLists;
  externalNullifier: PODValue;
  watermark: PODValue;
};

export interface PodspecProofRequest {
  pods: Record<string, PODSchema<EntriesSchema>>;
  externalNullifier: PODValue;
  watermark: PODValue;
}

export class ProofRequestSpec<P extends PodspecProofRequest> {
  private constructor(public readonly schema: P) {}

  public static create<P extends PodspecProofRequest>(
    proofRequest: P
  ): ProofRequestSpec<P> {
    return new ProofRequestSpec(proofRequest);
  }

  public getProofRequest(): ProofRequest {
    return makeProofRequest(this.schema);
  }

  public queryForInputs(pods: POD[]): Record<keyof P["pods"], POD[]> {
    const result: Record<string, POD[]> = {};
    for (const [podName, podSchema] of Object.entries(this.schema.pods)) {
      result[podName] = PodSpec.create(podSchema).query(pods).matches;
    }
    return result as Record<keyof P["pods"], POD[]>;
  }
}

export const proofRequest = ProofRequestSpec.create;

function makeProofRequest(request: PodspecProofRequest): ProofRequest {
  const pods: Record<PODName, GPCProofObjectConfig> = {};
  const membershipLists: PODMembershipLists = {};
  const tuples: Record<PODName, GPCProofTupleConfig> = {};

  for (const [podName, podSchema] of Object.entries(request.pods)) {
    const podConfig: GPCProofObjectConfig = { entries: {} };

    for (const [entryName, schema] of Object.entries(podSchema.entries)) {
      const entrySchema =
        schema.type === "optional" ? schema.innerType : schema;
      const entryConfig: GPCProofEntryConfig = {
        isRevealed: entrySchema.isRevealed ?? false,
        isMemberOf: entrySchema.isMemberOf
          ? `allowlist_${podName}_${entryName}`
          : undefined,
        isNotMemberOf: entrySchema.isNotMemberOf
          ? `blocklist_${podName}_${entryName}`
          : undefined,
        ...(entrySchema.type === "cryptographic" || entrySchema.type === "int"
          ? { inRange: entrySchema.inRange }
          : {}),
        ...(entrySchema.type === "cryptographic" && entrySchema.isOwnerID
          ? { isOwnerID: true }
          : {})
      };
      podConfig.entries[entryName] = entryConfig;

      if (entrySchema.isMemberOf) {
        membershipLists[`allowlist_${podName}_${entryName}`] =
          entrySchema.isMemberOf;
      }
      if (entrySchema.isNotMemberOf) {
        membershipLists[`blocklist_${podName}_${entryName}`] =
          entrySchema.isNotMemberOf;
      }
    }
    pods[podName] = podConfig;

    for (const entriesTupleSchema of podSchema.tuples ?? []) {
      const tupleName = `tuple_${podName}_entries_${entriesTupleSchema.entries.join(
        "_"
      )}`;
      tuples[tupleName] = {
        entries: entriesTupleSchema.entries.map(
          (entryName) => `${podName}.${entryName}` satisfies PODEntryIdentifier
        ),
        isMemberOf: entriesTupleSchema.isMemberOf
          ? `allowlist_${tupleName}`
          : undefined,
        isNotMemberOf: entriesTupleSchema.isNotMemberOf
          ? `blocklist_${tupleName}`
          : undefined
      } satisfies GPCProofTupleConfig;
      if (entriesTupleSchema.isMemberOf) {
        membershipLists[`allowlist_${tupleName}`] =
          entriesTupleSchema.isMemberOf;
      }
      if (entriesTupleSchema.isNotMemberOf) {
        membershipLists[`blocklist_${tupleName}`] =
          entriesTupleSchema.isNotMemberOf;
      }
    }
  }

  const p: ProofRequest = {
    proofConfig: {
      pods,
      tuples
    },
    membershipLists,
    watermark: request.watermark,
    externalNullifier: request.externalNullifier
  };

  return p;
}
