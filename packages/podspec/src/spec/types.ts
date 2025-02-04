import type { POD, PODContent, PODEntries, PODName, PODValue } from "@pcd/pod";
import type { NamedPODSpecs } from "../builders/group.js";
import type { EntryTypes } from "../builders/types/entries.js";

export type NamedStrongPODs<P extends NamedPODSpecs> = {
  [K in keyof P]: StrongPOD<PODEntriesFromEntryTypes<P[K]["entries"]>>;
};

/**
 * "Strong" PODContent is an extension of PODContent which extends the
 * `asEntries()` method to return a strongly-typed PODEntries.
 */
interface StrongPODContent<T extends PODEntries> extends PODContent {
  asEntries(): T & PODEntries;
  getValue<N extends keyof T | PODName>(
    name: N
  ): N extends keyof T ? T[N] : PODValue;
  getRawValue<N extends keyof T | PODName>(
    name: N
  ): N extends keyof T ? T[N]["value"] : PODValue["value"];
}

/**
 * A "strong" POD is a POD with a strongly-typed entries.
 */
export interface StrongPOD<T extends PODEntries> extends POD {
  content: StrongPODContent<T>;
}

export type PODEntriesFromEntryTypes<E extends EntryTypes> = {
  [K in keyof E]: Extract<PODValue, { type: E[K] }>;
};
