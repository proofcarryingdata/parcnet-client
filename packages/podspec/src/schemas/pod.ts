import { PODValue } from "@pcd/pod";
import { EntriesSchema, EntriesSchemaLiteral } from "./entries.js";

/**
 * Schema for validating a POD.
 */
export type PODSchema<E extends EntriesSchema> = {
  entries: EntriesSchemaLiteral<E>;
  tuples?: {
    entries: (keyof (EntriesSchemaLiteral<E> & { $signerPublicKey: never }) &
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
