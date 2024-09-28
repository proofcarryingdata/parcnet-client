import type {
  GPCProofConfig,
  GPCProofEntryConfig,
  GPCProofObjectConfig,
  GPCProofTupleConfig,
  IdentityProtocol,
  PODEntryIdentifier,
  PODMembershipLists
} from "@pcd/gpc";
import type { PODName, PODValue } from "@pcd/pod";
import { type PODData, PodSpec } from "../parse/pod.js";
import type { EntriesSchema } from "../schemas/entries.js";
import type { PODSchema } from "../schemas/pod.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NamedPODs = Record<string, ProofConfigPODSchema<any>>;

export interface ProofConfigOwner<E extends EntriesSchema> {
  entry: Extract<keyof E, string>;
  protocol: IdentityProtocol;
}

export interface ProofConfigPODSchema<E extends EntriesSchema> {
  pod: PODSchema<E>;
  revealed?: Partial<{
    [K in Extract<keyof (E & { $signerPublicKey: never }), string>]: boolean;
  }>;
  owner?: ProofConfigOwner<E>;
}

/**
 * A ProofRequest contains the data necessary to verify that a given GPC proof
 * matches our expectations of it.
 */
export type ProofRequest = {
  proofConfig: GPCProofConfig;
  membershipLists: PODMembershipLists;
  externalNullifier?: PODValue;
  watermark?: PODValue;
};

/**
 * A PodspecProofRequest allows us to generate a {@link ProofRequest} from a
 * set of Podspecs defining the allowable PODs.
 */
export interface PodspecProofRequestSchema<P extends NamedPODs = NamedPODs> {
  pods: P;
  externalNullifier?: PODValue;
  watermark?: PODValue;
}

/**
 * A ProofRequestSpec allows us to generate a {@link ProofRequest} from a
 * set of Podspecs defining the allowable PODs.
 */
export class ProofRequestSpec<
  P extends PodspecProofRequestSchema<T>,
  T extends NamedPODs
> {
  /**
   * Private constructor, see {@link create}.
   * @param schema The schema of the PODs that are allowed in this proof.
   */
  private constructor(public readonly schema: PodspecProofRequestSchema<T>) {}

  /**
   * Create a new ProofRequestSpec.
   * @param schema The schema of the PODs that are allowed in this proof.
   * @returns A new ProofRequestSpec.
   */
  public static create<
    P extends PodspecProofRequestSchema<T>,
    T extends NamedPODs
  >(schema: PodspecProofRequestSchema<T>): ProofRequestSpec<P, T> {
    return new ProofRequestSpec(schema);
  }

  /**
   * Get the {@link ProofRequest} that this ProofRequestSpec defines.
   * @returns A {@link ProofRequest}.
   */
  public getProofRequest(): ProofRequest {
    return makeProofRequest(this.schema);
  }

  /**
   * A ProofRequest defines a {@link GPCProofConfig} and part of the
   * {@link GPCProofInputs} - specifically the watermark, external nullifier,
   * and membership lists. However, a GPC proof also requires PODs as inputs.
   * Since we know from our schema which PODs would be acceptable inputs, we
   * can take an array of PODs and return a mapping of the require POD names
   * to the PODs from the array which would be suitable as inputs in each slot
   * respectively.
   *
   * @param pods The PODs to query.
   * @returns A record of the PODs that are allowed in this proof.
   */
  public queryForInputs(pods: PODData[]): Record<keyof P["pods"], PODData[]> {
    const result: Record<string, PODData[]> = {};
    for (const [podName, proofConfigPODSchema] of Object.entries(
      this.schema.pods as Record<string, ProofConfigPODSchema<EntriesSchema>>
    )) {
      const podSchema = proofConfigPODSchema.pod;
      result[podName] = PodSpec.create(podSchema).query(pods).matches;
    }
    return result as Record<keyof P["pods"], PODData[]>;
  }
}

/**
 * Export for convenience.
 */
export const proofRequest = <P extends NamedPODs>(
  schema: PodspecProofRequestSchema<P>
) => ProofRequestSpec.create(schema);

/**
 * Generates a {@link ProofRequest}.
 *
 * @param request The PodspecProofRequest to derive the ProofRequest from.
 * @returns A ProofRequest.
 */
function makeProofRequest<P extends NamedPODs>(
  request: PodspecProofRequestSchema<P>
): ProofRequest {
  const pods: Record<PODName, GPCProofObjectConfig> = {};
  const membershipLists: PODMembershipLists = {};
  const tuples: Record<PODName, GPCProofTupleConfig> = {};

  for (const [podName, proofConfigPODSchema] of Object.entries(
    request.pods as Record<string, ProofConfigPODSchema<EntriesSchema>>
  )) {
    const podConfig: GPCProofObjectConfig = { entries: {} };
    const podSchema = proofConfigPODSchema.pod;
    const owner = proofConfigPODSchema.owner;

    for (const [entryName, schema] of Object.entries(podSchema.entries)) {
      const entrySchema =
        schema.type === "optional" ? schema.innerType : schema;

      const isRevealed = proofConfigPODSchema.revealed?.[entryName] ?? false;
      const isMemberOf = entrySchema.isMemberOf;
      const isNotMemberOf = entrySchema.isNotMemberOf;
      const inRange =
        (entrySchema.type === "cryptographic" || entrySchema.type === "int") &&
        entrySchema.inRange;
      const isOwnerID =
        (entrySchema.type === "cryptographic" ||
          entrySchema.type === "eddsa_pubkey") &&
        owner?.entry === entryName;

      if (
        !isRevealed &&
        !isMemberOf &&
        !isNotMemberOf &&
        !inRange &&
        !isOwnerID
      ) {
        continue;
      }

      const entryConfig: GPCProofEntryConfig = {
        isRevealed,
        isMemberOf: isMemberOf
          ? `allowlist_${podName}_${entryName}`
          : undefined,
        isNotMemberOf: isNotMemberOf
          ? `blocklist_${podName}_${entryName}`
          : undefined,
        ...(inRange ? { inRange: entrySchema.inRange } : {}),
        ...(isOwnerID ? { isOwnerID: owner.protocol } : {})
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
      // Tuples may contain entries which are not revealed or subject to any
      // membership rules or constraints, in which case we need to add them to
      // the proof config so that they are included.
      for (const entry of entriesTupleSchema.entries) {
        if (entry === "$signerPublicKey") {
          continue;
        }
        if (!(entry in podConfig.entries)) {
          podConfig.entries[entry] = {
            isRevealed: false
          };
        }
      }
    }

    pods[podName] = podConfig;
  }

  return {
    proofConfig: {
      pods,
      tuples
    },
    membershipLists,
    watermark: request.watermark,
    externalNullifier: request.externalNullifier
  } satisfies ProofRequest;
}
