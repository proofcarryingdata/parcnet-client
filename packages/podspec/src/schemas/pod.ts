import { PODValue } from "@pcd/pod";
import { EntriesSchema } from "./entries";

export type PODTupleSchema<E extends EntriesSchema> = {
  entries: (keyof (E & { $signerPublicKey: never }))[];
  isMemberOf?: PODValue[][];
  isNotMemberOf?: PODValue[][];
};

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
