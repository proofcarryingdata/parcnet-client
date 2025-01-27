import type { PODName, PODValue } from "@pcd/pod";
import type { EntryListSpec } from "./entries.js";

type PODValueTypeForEntry<
  E extends EntryListSpec,
  K extends keyof E
> = E[K]["type"];

export type EntryNamesForPOD<E extends EntryListSpec> = readonly [
  keyof (E & {
    $signerPublicKey: never;
  }) &
    PODName,
  ...(keyof (E & {
    $signerPublicKey: never;
  }) &
    PODName)[]
];

/**
 * Schema for validating a POD.
 */
export type PODTupleSpec<
  E extends EntryListSpec,
  Names extends readonly (keyof E)[] = (keyof E)[]
> = {
  entries: Names;
  isMemberOf?: {
    [I in keyof Names]: Extract<
      PODValue,
      { type: PODValueTypeForEntry<E, Names[I]> }
    >;
  }[];
  isNotMemberOf?: {
    [I in keyof Names]: Extract<
      PODValue,
      { type: PODValueTypeForEntry<E, Names[I]> }
    >;
  }[];
};

export type PODTuplesSpec<E extends EntryListSpec> = Record<
  string,
  PODTupleSpec<E, EntryNamesForPOD<E>>
>;

export type PODSpec<E extends EntryListSpec> = {
  entries: E;
  tuples: PODTuplesSpec<E>;
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
    labelEntry: keyof E & PODName;
  };
};
