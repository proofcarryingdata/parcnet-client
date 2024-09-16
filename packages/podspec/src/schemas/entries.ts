import type { PODValue } from "@pcd/pod";
import type { EntrySchema } from "./entry.js";

/**
 * Schema for validating a PODEntries object.
 */
export type EntriesSchema = Readonly<Record<string, EntrySchema>>;

/**
 * Schema for a tuple of entries.
 */
export type EntriesTupleSchema<E extends EntriesSchema> = {
  entries: (keyof E & string)[];
  isMemberOf?: PODValue[][];
  isNotMemberOf?: PODValue[][];
};
