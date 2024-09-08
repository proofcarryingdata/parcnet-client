import { EntriesOutputType } from "./parse/entries.js";
import { PodSpec, StrongPOD } from "./parse/pod.js";

export type InferEntriesType<T> = T extends { [K in keyof T]: infer U }
  ? U
  : never;

export type InferPodType<T> =
  T extends PodSpec<infer E> ? StrongPOD<EntriesOutputType<E>> : never;
