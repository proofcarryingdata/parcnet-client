import type { PODValue } from "@pcd/pod";
import type { EntriesSchema } from "./entries.js";
import type { EntrySchema } from "./entry.js";

type RealEntriesSchemaLiteralEntries<T extends EntriesSchema> = {
  [K in keyof T]: T[K] & EntrySchema;
};

type RealEntriesSchemaLiteral<E extends EntriesSchema> =
  RealEntriesSchemaLiteralEntries<E> & EntriesSchema;

/**
 * Schema for validating a POD.
 */
export type PODSchema<E extends EntriesSchema> = {
  entries: E & EntriesSchema;
  tuples?: {
    entries: (keyof (RealEntriesSchemaLiteral<E> & {
      $signerPublicKey: never;
    }) &
      string)[];
    isMemberOf?: PODValue[][];
    isNotMemberOf?: PODValue[][];
  }[];
  signerPublicKey?: {
    isMemberOf?: string[];
    isNotMemberOf?: string[];
  };
  signature?: {
    isMemberOf?: string[];
    isNotMemberOf?: string[];
  };
};

export type PODTupleSchema<E extends EntriesSchema> = Required<
  PODSchema<E>
>["tuples"][number];
