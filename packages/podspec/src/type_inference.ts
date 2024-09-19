import type { EntriesSpec } from "./parse/entries.js";
import type {
  PODValueCoerceableNativeTypes,
  PODValueNativeTypes
} from "./parse/parse_utils.js";
import type { PodSpec, StrongPOD } from "./parse/pod.js";
import type { EntriesSchema } from "./schemas/entries.js";
import type { DefinedEntrySchema, OptionalSchema } from "./schemas/entry.js";

/**
 * Infer a typed version of a POD from a given Podspec.
 */
export type InferPodType<T> = T extends PodSpec<infer E>
  ? StrongPOD<EntriesOutputType<E>>
  : never;

export type InferEntriesType<T> = T extends PodSpec<infer E>
  ? E
  : T extends EntriesSpec<infer E>
    ? E
    : never;

type JavaScriptEntriesType<E extends EntriesSchema> = AddQuestionMarks<{
  [k in keyof E]: E[k] extends DefinedEntrySchema
    ? PODValueCoerceableNativeTypes[E[k]["type"]]
    : E[k] extends OptionalSchema
      ? PODValueCoerceableNativeTypes[E[k]["innerType"]["type"]] | undefined
      : never;
}>;

export type InferJavaScriptEntriesType<T> = T extends PodSpec<infer E>
  ? JavaScriptEntriesType<E>
  : T extends EntriesSpec<infer E>
    ? JavaScriptEntriesType<E>
    : never;

/**
 * Gets the output type for entries matching a given schema.
 * The output type is a record mapping string keys to PODValues, and is
 * therefore similar to {@link PODEntries}, but is specific about the values
 * that certain entries ought to have.
 */
export type EntriesOutputType<E extends EntriesSchema> = AddQuestionMarks<{
  [k in keyof E]: E[k] extends DefinedEntrySchema
    ? {
        type: E[k]["type"];
        value: PODValueNativeTypes[E[k]["type"]];
      }
    : E[k] extends OptionalSchema
      ?
          | {
              type: E[k]["innerType"]["type"];
              value: PODValueNativeTypes[E[k]["innerType"]["type"]];
            }
          | undefined
      : never;
}>;
type optionalKeys<T extends object> = {
  [k in keyof T]: undefined extends T[k] ? k : never;
}[keyof T];
type requiredKeys<T extends object> = {
  [k in keyof T]: undefined extends T[k] ? never : k;
}[keyof T];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AddQuestionMarks<T extends object, _O = any> = {
  [K in requiredKeys<T>]: T[K];
} & {
  [K in optionalKeys<T>]?: T[K];
};
