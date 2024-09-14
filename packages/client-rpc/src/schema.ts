import { GPCBoundConfig, GPCRevealedClaims } from "@pcd/gpc";
import { Groth16Proof } from "snarkjs";
import { z } from "zod";
import { ParcnetRPC } from "./rpc_interfaces.js";

const PODValueSchema = z.object({
  type: z.enum(["string", "int", "cryptographic", "eddsa_pubkey"]),
  value: z.union([z.string(), z.bigint()])
});

const PODEntriesSchema = z.record(PODValueSchema);

const DefinedEntrySchema = z.object({
  type: z.enum(["string", "int", "cryptographic", "eddsa_pubkey"]),
  isMemberOf: z.array(PODValueSchema).optional(),
  isNotMemberOf: z.array(PODValueSchema).optional(),
  isRevealed: z.boolean().optional(),
  equalsEntry: z.string().optional(),
  inRange: z
    .object({
      min: z.bigint(),
      max: z.bigint()
    })
    .optional()
});

const OptionalEntrySchema = z.object({
  type: z.literal("optional"),
  innerType: DefinedEntrySchema
});

const EntrySchema = z.union([DefinedEntrySchema, OptionalEntrySchema]);

const PODTupleSchema = z.object({
  entries: z.array(z.string()),
  isMemberOf: z.array(z.array(PODValueSchema)).optional(),
  isNotMemberOf: z.array(z.array(PODValueSchema)).optional()
});

const SignerPublicKeySchema = z.object({
  isMemberOf: z.array(z.string()).optional(),
  isNotMemberOf: z.array(z.string()).optional()
});

const SignatureSchema = z.object({
  isMemberOf: z.array(z.string()).optional(),
  isNotMemberOf: z.array(z.string()).optional()
});

const PODSchemaSchema = z.object({
  entries: z.record(EntrySchema),
  tuples: z.array(PODTupleSchema).optional(),
  signerPublicKey: SignerPublicKeySchema.optional(),
  signature: SignatureSchema.optional()
});

const PodspecProofRequestSchema = z.object({
  pods: z.record(z.string(), PODSchemaSchema),
  externalNullifier: PODValueSchema.optional(),
  watermark: PODValueSchema.optional()
});

const ProveResultSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    // TODO: More specific schemas for these
    proof: z.custom<Groth16Proof>(),
    boundConfig: z.custom<GPCBoundConfig>(),
    revealedClaims: z.custom<GPCRevealedClaims>()
  }),
  z.object({
    success: z.literal(false),
    error: z.string()
  })
]);

export const ParcnetRPCSchema = z.object({
  _version: z.literal("1"),
  gpc: z.object({
    prove: z
      .function()
      .args(PodspecProofRequestSchema)
      .returns(z.promise(ProveResultSchema)),
    canProve: z
      .function()
      .args(PodspecProofRequestSchema)
      .returns(z.promise(z.boolean())),
    verify: z
      .function()
      .args(z.any(), z.any(), z.any())
      .returns(z.promise(z.boolean()))
  }),
  identity: z.object({
    getSemaphoreV3Commitment: z.function().returns(z.promise(z.bigint()))
  }),
  pod: z.object({
    query: z
      .function()
      .args(PODSchemaSchema)
      .returns(z.promise(z.array(z.string()))),
    insert: z.function().args(z.string()).returns(z.promise(z.void())),
    delete: z.function().args(z.string()).returns(z.promise(z.void())),
    subscribe: z
      .function()
      .args(PODSchemaSchema)
      .returns(z.promise(z.string())),
    unsubscribe: z.function().args(z.string()).returns(z.promise(z.void())),
    sign: z.function().args(PODEntriesSchema).returns(z.promise(z.string()))
  })
}) satisfies z.ZodSchema<ParcnetRPC>;
