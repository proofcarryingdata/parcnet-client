import type { GPCBoundConfig, GPCRevealedClaims } from "@pcd/gpc";
import type { Groth16Proof } from "snarkjs";
import * as v from "valibot";

export const PODValueSchema = v.variant("type", [
  v.object({
    type: v.literal("string"),
    value: v.string()
  }),
  v.object({
    type: v.literal("int"),
    value: v.bigint()
  }),
  v.object({
    type: v.literal("cryptographic"),
    value: v.bigint()
  }),
  v.object({
    type: v.literal("eddsa_pubkey"),
    value: v.string()
  })
]);

export const PODEntriesSchema = v.record(v.string(), PODValueSchema);

export const DefinedEntrySchema = v.variant("type", [
  v.object({
    type: v.literal("string"),
    isMemberOf: v.optional(v.array(PODValueSchema)),
    isNotMemberOf: v.optional(v.array(PODValueSchema)),
    isRevealed: v.optional(v.boolean()),
    equalsEntry: v.optional(v.string())
  }),
  v.object({
    type: v.literal("int"),
    isMemberOf: v.optional(v.array(PODValueSchema)),
    isNotMemberOf: v.optional(v.array(PODValueSchema)),
    isRevealed: v.optional(v.boolean()),
    equalsEntry: v.optional(v.string()),
    inRange: v.optional(
      v.object({
        min: v.bigint(),
        max: v.bigint()
      })
    )
  }),
  v.object({
    type: v.literal("cryptographic"),
    isMemberOf: v.optional(v.array(PODValueSchema)),
    isNotMemberOf: v.optional(v.array(PODValueSchema)),
    isRevealed: v.optional(v.boolean()),
    equalsEntry: v.optional(v.string())
  }),
  v.object({
    type: v.literal("eddsa_pubkey"),
    isMemberOf: v.optional(v.array(PODValueSchema)),
    isNotMemberOf: v.optional(v.array(PODValueSchema)),
    isRevealed: v.optional(v.boolean()),
    equalsEntry: v.optional(v.string())
  })
]);

export const OptionalEntrySchema = v.object({
  type: v.literal("optional"),
  innerType: DefinedEntrySchema
});

export const EntrySchema = v.variant("type", [
  DefinedEntrySchema,
  OptionalEntrySchema
]);

export const PODTupleSchema = v.object({
  entries: v.array(v.string()),
  isMemberOf: v.optional(v.array(v.array(PODValueSchema))),
  isNotMemberOf: v.optional(v.array(v.array(PODValueSchema)))
});

export const SignerPublicKeySchema = v.object({
  isMemberOf: v.optional(v.array(v.string())),
  isNotMemberOf: v.optional(v.array(v.string()))
});

export const SignatureSchema = v.object({
  isMemberOf: v.optional(v.array(v.string())),
  isNotMemberOf: v.optional(v.array(v.string()))
});

export const PODSchemaSchema = v.object({
  entries: v.record(v.string(), EntrySchema),
  tuples: v.optional(v.array(PODTupleSchema)),
  signerPublicKey: v.optional(SignerPublicKeySchema),
  signature: v.optional(SignatureSchema),
  meta: v.optional(
    v.object({
      labelEntry: v.string()
    })
  )
});

export const ProofConfigPODSchemaSchema = v.object({
  pod: PODSchemaSchema,
  revealed: v.optional(v.record(v.string(), v.optional(v.boolean()))),
  owner: v.optional(
    v.object({
      entry: v.string(),
      protocol: v.union([v.literal("SemaphoreV3"), v.literal("SemaphoreV4")])
    })
  )
});

export const PodspecProofRequestSchema = v.object({
  pods: v.record(v.string(), ProofConfigPODSchemaSchema),
  externalNullifier: v.optional(PODValueSchema),
  watermark: v.optional(PODValueSchema)
});

export const ProveResultSchema = v.variant("success", [
  v.object({
    success: v.literal(true),
    // TODO: More specific schemas for these
    proof: v.custom<Groth16Proof>(() => true),
    boundConfig: v.custom<GPCBoundConfig>(() => true),
    revealedClaims: v.custom<GPCRevealedClaims>(() => true)
  }),
  v.object({
    success: v.literal(false),
    error: v.string()
  })
]);
