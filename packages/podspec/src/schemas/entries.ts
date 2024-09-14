import { PODValue } from "@pcd/pod";
import { EntrySchema } from "./entry.js";

/**
 * Schema for validating a PODEntries object.
 */
export type EntriesSchema = Record<string, EntrySchema>;

type EntriesSchemaLiteralEntries<T extends EntriesSchema> = {
  [K in keyof T]: T[K] & EntrySchema;
};

export type EntriesSchemaLiteral<E extends EntriesSchema> =
  EntriesSchemaLiteralEntries<E> & EntriesSchema;

/**
 * Schema for a tuple of entries.
 */
export type EntriesTupleSchema<E extends EntriesSchema> = {
  entries: (keyof E & string)[];
  isMemberOf?: PODValue[][];
  isNotMemberOf?: PODValue[][];
};
