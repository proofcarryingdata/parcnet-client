import { EntrySchema } from "../parse/entry";

export type EntriesSchema = Record<string, EntrySchema>;

// export type EntriesTupleSchema<E extends EntriesSchema> = {
//   entries: (keyof E)[];
//   isMemberOf?: PODValue[][];
//   isNotMemberOf?: PODValue[][];
// };
