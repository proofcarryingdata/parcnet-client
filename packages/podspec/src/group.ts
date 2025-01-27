/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/array-type */
import type { PODValue } from "@pcd/pod";
import type { PodSpec } from "./parse/pod.js";

/*
@todo
- [ ] rebuild group builder along the same line as podv2
*/

// This describes the minimal shape we need
type HasSchemaEntries<T = unknown> = {
  schema: {
    entries: T;
  };
};

// Get the keys from a type, excluding any index signature
type LiteralKeys<T> = keyof {
  [K in keyof T as string extends K ? never : K]: T[K];
};

// Create a union type that maintains the relationship between pod and its entries
type PodEntryPair<P> = {
  [K in keyof P]: P[K] extends { schema: { entries: infer E } }
    ? `${K & string}.${LiteralKeys<E> & string}`
    : never;
}[keyof P];

// Helper to create fixed-length array type
type FixedLengthArray<
  T,
  N extends number,
  R extends T[] = []
> = R["length"] extends N ? R : FixedLengthArray<T, N, [...R, T]>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Length<T extends readonly any[]> = T["length"];

type TupleSpec<P, E extends readonly [...PodEntryPair<P>[]]> = {
  entries: E;
  isMemberOf?: { [K in keyof E]: PODValue }[];
  isNotMemberOf?: { [K in keyof E]: PODValue }[];
};

export type PodSpecGroupSchema<
  P,
  T extends ReadonlyArray<TupleSpec<P, readonly [...PodEntryPair<P>[]]>>
> = {
  pods: P;
  tuples: T;
};

// Debug types
type TestPodSpec1 = PodSpec<{ foo: { type: "string" } }>;
type TestPodSpec2 = PodSpec<{ bar: { type: "string" } }>;
type TestPods = {
  p1: TestPodSpec1;
  p2: TestPodSpec2;
};

/// Expand a type recursively
type ExpandRecursively<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandRecursively<O[K]> }
    : never
  : T;

// The class inherits the same constraint
export class PodSpecGroup<
  P extends Record<string, HasSchemaEntries>,
  T extends readonly TupleSpec<P, readonly [...PodEntryPair<P>[]]>[]
> {
  readonly specs: PodSpecGroupSchema<P, T>;

  constructor(schema: PodSpecGroupSchema<P, T>) {
    this.specs = schema;
  }

  get<K extends keyof P>(key: K): P[K] {
    return this.specs.pods[key];
  }
}
// Debug concrete PodEntryPair
type DebugPodEntryPair = ExpandRecursively<PodEntryPair<TestPods>>;
// This will show: "p1.foo" | "p2.bar"

// Debug concrete PodSpecGroupSchema
type DebugPodSpecGroupSchema = ExpandRecursively<
  PodSpecGroupSchema<TestPods, [TupleSpec<TestPods, ["p1.foo", "p2.bar"]>]>
>;
type DebugPodSpecTuples = ExpandRecursively<DebugPodSpecGroupSchema["tuples"]>;
// This will show the full structure:
// {
//   pods: TestPods;
//   tuples?: {
//     entries: PodEntryPair<TestPods>[];
//     isMemberOf?: PODValue[][];
//     isNotMemberOf?: PODValue[][];
//   }[];
// }

type DebugTupleSpec = TupleSpec<
  TestPods,
  readonly [PodEntryPair<TestPods>, PodEntryPair<TestPods>]
>;

// Debug types to understand length inference
type TestEntries = ["p1.foo", "p2.bar"];
type TestEntriesLength = Length<TestEntries>; // should be 2
type TestFixedArray = FixedLengthArray<PODValue, TestEntriesLength>;

// Debug what happens in PodSpecGroupSchema
type TestGroupSchema = PodSpecGroupSchema<
  TestPods,
  [TupleSpec<TestPods, TestEntries, TestEntriesLength, TestFixedArray>]
>;
type TestGroupSchemaTuples = ExpandRecursively<TestGroupSchema["tuples"]>;
