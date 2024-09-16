import type { EntriesOutputType } from "./parse/entries.js";
import type { PodSpec, StrongPOD } from "./parse/pod.js";

/**
 * Infer a typed version of a POD from a given Podspec.
 */
export type InferPodType<T> = T extends PodSpec<infer E>
  ? StrongPOD<EntriesOutputType<E>>
  : never;
