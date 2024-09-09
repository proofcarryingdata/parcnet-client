import { PODValue } from "@pcd/pod";
import { EntriesSchema } from "./entries.js";

/**
 * Schema for a tuple of entries.
 */
export type PODTupleSchema<E extends EntriesSchema> = {
  entries: (keyof (E & { $signerPublicKey: never }))[];
  isMemberOf?: PODValue[][];
  isNotMemberOf?: PODValue[][];
};

/**
 * Schema for validating a POD.
 */
export type PODSchema<E extends EntriesSchema> = {
  entries: E;
  tuples?: PODTupleSchema<E>[];
  signerPublicKey?: {
    isMemberOf?: string[];
    isNotMemberOf?: string[];
  };
  signature?: {
    isMemberOf?: string[];
    isNotMemberOf?: string[];
  };
};
