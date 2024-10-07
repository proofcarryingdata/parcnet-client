import * as v from "valibot";
import type { ParcnetRPC } from "./rpc_interfaces.js";
import {
  PODEntriesSchema,
  PODSchemaSchema,
  PodspecProofRequestSchema,
  ProveResultSchema
} from "./schema_elements.js";

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
      input: v.tuple([v.any(), v.any(), v.any()]),
      output: v.boolean()
    },
    verifyWithProofRequest: {
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
      output: v.array(v.string())
    },
    insert: {
      input: v.tuple([v.string()] as [
        serializedPOD: ReturnType<typeof v.string>
      ]),
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
const _schemaTypeCheck = {} as InferredNewSchema satisfies Omit<
  ParcnetRPC,
  "_version"
>;
