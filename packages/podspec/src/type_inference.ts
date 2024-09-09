import { EntriesOutputType } from "./parse/entries.js";
import { PodSpec, StrongPOD } from "./parse/pod.js";

/**
 * Infer a typed version of PODEntries, specific to a set of entries defined
 * by a Podspec.
 */
export type InferEntriesType<T> = T extends { [K in keyof T]: infer U }
  ? U
  : never;

/**
 * Infer a typed version of a POD from a given Podspec.
 */
export type InferPodType<T> =
  T extends PodSpec<infer E> ? StrongPOD<EntriesOutputType<E>> : never;
