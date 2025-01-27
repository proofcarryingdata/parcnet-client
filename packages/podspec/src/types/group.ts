import type { PODName, PODValue } from "@pcd/pod";
import type { EntryListSpec } from "./entries.js";
import type { PODValueType } from "./utils.js";

export type HasEntries<T extends EntryListSpec = EntryListSpec> = {
  entries: T;
};

export type PodEntryStrings<P extends Record<string, HasEntries>> = {
  [K in keyof P]: {
    [E in keyof P[K]["entries"]]: `${K & string}.${E & string}`;
  }[keyof P[K]["entries"]];
}[keyof P];

export type TupleSpec<
  P extends Record<string, HasEntries>,
  E extends readonly PodEntryStrings<P>[] = readonly PodEntryStrings<P>[]
> = {
  entries: E;
  isMemberOf?: [{ [K in keyof E]: PODValue }[number]][];
  isNotMemberOf?: [{ [K in keyof E]: PODValue }[number]][];
};

export type PodGroupSpec<P extends Record<PODName, HasEntries>> = {
  pods: P & Record<string, HasEntries>;
};

export type PodGroupSpecPods<
  P extends PodGroupSpec<Record<PODName, HasEntries>> = PodGroupSpec<
    Record<PODName, HasEntries>
  >
> = P["pods"];

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type PodEntryNames<P extends Record<string, HasEntries>> = {
  [K in keyof P]: (keyof P[K]["entries"] & string)[];
};

export type PodEntryStringsOfType<
  P extends Record<string, HasEntries>,
  T extends PODValueType
> = {
  [K in keyof P]: {
    [E in keyof P[K]["entries"]]: P[K]["entries"][E]["type"] extends T
      ? `${K & string}.${E & string}`
      : never;
  }[keyof P[K]["entries"]];
}[keyof P];

// Add this helper type
type AssertEqual<T, U> = [T] extends [U]
  ? [U] extends [T]
    ? true
    : false
  : false;

type _TestPodEntryStrings = PodEntryStrings<{
  pod1: { entries: { foo: { type: "string" } } };
  pod2: { entries: { foo: { type: "int" }; bar: { type: "string" } } };
}>;

// This creates a type error when the condition is false
type Assert<T extends true> = T;
type IsEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B
  ? 1
  : 2
  ? true
  : false;

// This should fail compilation if types don't match
type _Test = Assert<
  IsEqual<_TestPodEntryStrings, "pod1.foo" | "pod2.foo" | "pod2.bar">
>;

// If you want to see an error when types don't match:
type _TestShouldFail = AssertEqual<_TestPodEntryStrings, "wrong_type">;

type _TestPodEntryStringsOfType = PodEntryStringsOfType<
  {
    pod1: { entries: { foo: { type: "int" } } };
    pod2: { entries: { foo: { type: "int" }; bar: { type: "string" } } };
  },
  "int"
>; // "pod1.foo" | "pod2.foo"

// Split a PodEntryPair into its pod and entry components
type SplitPodEntry<T extends string> = T extends `${infer Pod}.${infer Entry}`
  ? { pod: Pod; entry: Entry }
  : never;

// Get the type of an entry given a pod and entry name
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type EntryType<
  P extends Record<string, HasEntries>,
  PE extends PodEntryPair<P>
> = SplitPodEntry<PE> extends { pod: infer Pod }
  ? Pod extends keyof P
    ? SplitPodEntry<PE> extends { entry: infer Entry }
      ? Entry extends keyof P[Pod]["entries"]
        ? P[Pod]["entries"][Entry]["type"]
        : never
      : never
    : never
  : never;
