import type { PODValue } from "@pcd/pod";
import type { EntriesSchema } from "./entries.js";

/**
 * Schema for validating a POD.
 */
export type PODSchema<E extends EntriesSchema> = {
  entries: E & EntriesSchema;
  tuples?: {
    entries: (keyof (E & {
      $signerPublicKey: never;
    }) &
      string)[];
    isMemberOf?: PODValue[][];
    isNotMemberOf?: PODValue[][];
  }[];
  signerPublicKey?: {
    isRevealed?: boolean;
    isMemberOf?: string[];
    isNotMemberOf?: string[];
  };
  signature?: {
    isMemberOf?: string[];
    isNotMemberOf?: string[];
  };
  meta?: {
    labelEntry: keyof E & string;
  };
};

export type PODTupleSchema<E extends EntriesSchema> = Required<
  PODSchema<E>
>["tuples"][number];
