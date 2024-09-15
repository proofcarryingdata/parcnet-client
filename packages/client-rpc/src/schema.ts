import { GPCBoundConfig, GPCRevealedClaims } from "@pcd/gpc";
import { Groth16Proof } from "snarkjs";
import * as v from "valibot";
import { ParcnetRPC } from "./rpc_interfaces.js";

const PODValueSchema = v.union([
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

const DefinedEntrySchema = v.union([
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

const EntrySchema = v.union([DefinedEntrySchema, OptionalEntrySchema]);

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
  signature: v.optional(SignatureSchema)
});

const PodspecProofRequestSchema = v.object({
  pods: v.record(v.string(), PODSchemaSchema),
  externalNullifier: v.optional(PODValueSchema),
  watermark: v.optional(PODValueSchema)
});

const ProveResultSchema = v.union([
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
    }
  },
  pod: {
    query: {
      input: v.tuple([PODSchemaSchema]),
      output: v.array(v.string())
    },
    insert: {
      input: v.tuple([v.string()]),
      output: v.void()
    },
    delete: {
      input: v.tuple([v.string()]),
      output: v.void()
    },
    subscribe: {
      input: v.tuple([PODSchemaSchema]),
      output: v.string()
    },
    unsubscribe: {
      input: v.tuple([v.string()]),
      output: v.void()
    },
    sign: {
      input: v.tuple([PODEntriesSchema]),
      output: v.string()
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
export const _schemaTypeCheck = {} as InferredNewSchema satisfies Omit<
  ParcnetRPC,
  "_version"
>;
