import { PODValue } from "@pcd/pod";
import { EntrySchema } from "./entry.js";

export type EntriesSchema = Record<string, EntrySchema>;

export type EntriesTupleSchema<E extends EntriesSchema> = {
  entries: (keyof E)[];
  isMemberOf?: PODValue[][];
  isNotMemberOf?: PODValue[][];
};
