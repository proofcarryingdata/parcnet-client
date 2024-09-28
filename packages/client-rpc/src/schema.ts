import type { GPCBoundConfig, GPCRevealedClaims } from "@pcd/gpc";
import type { Groth16Proof } from "snarkjs";
import * as v from "valibot";
import type { ParcnetRPC } from "./rpc_interfaces.js";

const PODValueSchema = v.variant("type", [
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

const PODEntriesSchema = v.record(v.string(), PODValueSchema);

const DefinedEntrySchema = v.variant("type", [
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

const OptionalEntrySchema = v.object({
  type: v.literal("optional"),
  innerType: DefinedEntrySchema
});

const EntrySchema = v.variant("type", [
  DefinedEntrySchema,
  OptionalEntrySchema
]);

const PODTupleSchema = v.object({
  entries: v.array(v.string()),
  isMemberOf: v.optional(v.array(v.array(PODValueSchema))),
  isNotMemberOf: v.optional(v.array(v.array(PODValueSchema)))
});

const SignerPublicKeySchema = v.object({
  isMemberOf: v.optional(v.array(v.string())),
  isNotMemberOf: v.optional(v.array(v.string()))
});

const SignatureSchema = v.object({
  isMemberOf: v.optional(v.array(v.string())),
  isNotMemberOf: v.optional(v.array(v.string()))
});

const PODSchemaSchema = v.object({
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

const ProofConfigPODSchemaSchema = v.object({
  pod: PODSchemaSchema,
  revealed: v.optional(v.record(v.string(), v.optional(v.boolean()))),
  owner: v.optional(
    v.object({
      entry: v.string(),
      protocol: v.union([v.literal("SemaphoreV3"), v.literal("SemaphoreV4")])
    })
  )
});

const PodspecProofRequestSchema = v.object({
  pods: v.record(v.string(), ProofConfigPODSchemaSchema),
  externalNullifier: v.optional(PODValueSchema),
  watermark: v.optional(PODValueSchema)
});

const ProveResultSchema = v.variant("success", [
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

export const PODDataSchema = v.object({
  entries: PODEntriesSchema,
  signature: v.string(),
  signerPublicKey: v.string()
});

export type RPCFunction<
  I extends v.TupleSchema<
    v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>[],
    v.ErrorMessage<v.TupleIssue> | undefined
  > = v.TupleSchema<
    v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>[],
    v.ErrorMessage<v.TupleIssue> | undefined
  >,
  O extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>> = v.BaseSchema<
    unknown,
    unknown,
    v.BaseIssue<unknown>
  >
> = {
  input: I;
  output: O;
};

type InferredRPCFunction<
  I extends v.TupleSchema<
    v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>[],
    v.ErrorMessage<v.TupleIssue> | undefined
  >,
  O extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>
> = (...args: v.InferInput<I>) => Promise<v.InferOutput<O>>;

type RPCSchema = Record<string, Record<string, RPCFunction>>;

export const ParcnetRPCSchema = {
  gpc: {
    prove: {
      input: v.tuple([PodspecProofRequestSchema] as [
        proofRequest: typeof PodspecProofRequestSchema
      ]),
      output: ProveResultSchema
    },
    canProve: {
      input: v.tuple([PodspecProofRequestSchema] as [
        proofRequest: typeof PodspecProofRequestSchema
      ]),
      output: v.boolean()
    },
    verify: {
      input: v.tuple([v.any(), v.any(), v.any(), v.any()]),
      output: v.boolean()
    }
  },
  identity: {
    getSemaphoreV3Commitment: {
      input: v.tuple([]),
      output: v.bigint()
    },
    getSemaphoreV4Commitment: {
      input: v.tuple([]),
      output: v.bigint()
    },
    getPublicKey: {
      input: v.tuple([]),
      output: v.string()
    }
  },
  pod: {
    query: {
      input: v.tuple([PODSchemaSchema] as [query: typeof PODSchemaSchema]),
      output: v.array(PODDataSchema)
    },
    insert: {
      input: v.tuple([PODDataSchema] as [podData: typeof PODDataSchema]),
      output: v.void()
    },
    delete: {
      input: v.tuple([v.string()] as [signature: ReturnType<typeof v.string>]),
      output: v.void()
    },
    subscribe: {
      input: v.tuple([PODSchemaSchema] as [query: typeof PODSchemaSchema]),
      output: v.string()
    },
    unsubscribe: {
      input: v.tuple([v.string()] as [
        subscriptionId: ReturnType<typeof v.string>
      ]),
      output: v.void()
    },
    sign: {
      input: v.tuple([PODEntriesSchema] as [entries: typeof PODEntriesSchema]),
      output: PODDataSchema
    }
  }
} as const satisfies RPCSchema;

type InferredRPCSchema<T extends RPCSchema> = {
  [K in keyof T]: {
    [M in keyof T[K]]: T[K][M] extends RPCFunction<infer I, infer O>
      ? InferredRPCFunction<I, O>
      : never;
  };
};

type InferredNewSchema = InferredRPCSchema<typeof ParcnetRPCSchema>;
const _schemaTypeCheck = {} as InferredNewSchema satisfies Omit<
  ParcnetRPC,
  "_version"
>;
