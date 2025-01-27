import {
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN,
  POD_DATE_MAX,
  POD_DATE_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  type PODName,
  type PODValue
} from "@pcd/pod";
import type { EntryListSpec, EntrySpec } from "../types/entries.js";
import type { PODValueType } from "../types/utils.js";
import { validateRange } from "./shared.js";

/**
 @todo
 - [ ] add lessThan, greaterThan, lessThanEq, greaterThanEq
 - [ ] add omit
 - [ ] maybe add pick/omit for constraints?
 - [x] add signerPublicKey support
 - [ ] add constraints on signature
 - [x] add contentID virtual entry 
 - [ ] refactor types
 - [ ] rename away from v2 suffix
 - [ ] validate entry names
 - [ ] validate constraint parameters
 - [ ] switch to using value types rather than PODValues (everywhere?)
 - [ ] change `create` parameter to not take a PODEntryListSpec (maybe it should take nothing)
 */

const virtualEntryNames = new Set([
  "$contentID",
  "$signature",
  "$signerPublicKey"
]);

type VirtualEntries = {
  $contentID: { type: "string" };
  $signature: { type: "string" };
  $signerPublicKey: { type: "eddsa_pubkey" };
};

export type PODSpecV2<E extends EntryListSpec, C extends ConstraintMap> = {
  entries: E;
  constraints: C;
};

type EntryTypes = Record<PODName, PODValueType>;

type EntryKeys<E extends EntryListSpec> = (keyof E & string)[];

type PODValueTupleForNamedEntries<
  E extends EntryListSpec,
  Names extends EntryKeys<E>
> = {
  [K in keyof Names]: PODValueTypeForEntry<E[Names[K] & keyof E]>;
};

type PODValueTypeFromTypeName<T extends PODValueType> = Extract<
  PODValue,
  { type: T }
>;

type PODValueTypeForEntry<E extends EntrySpec> = E["type"] extends PODValueType
  ? PODValueTypeFromTypeName<E["type"]>
  : never;

// type EntryType<E extends EntrySpec> = E["type"];
// type NamedEntry<E extends EntrySpec, N extends keyof E> = E[N];
// type EntryOfType<E extends EntrySpec, T extends EntryType<E>> = E extends {
//   [P in keyof E]: { type: T };
// }
//   ? E
//   : never;

type EntriesOfType<E extends EntryListSpec, T extends EntrySpec["type"]> = {
  [P in keyof E as E[P] extends { type: T } ? P & string : never]: E[P];
};

type IsMemberOf<E extends EntryListSpec, N extends EntryKeys<E>> = {
  entries: N;
  type: "isMemberOf";
  isMemberOf: PODValueTupleForNamedEntries<E, N>[];
};

type IsNotMemberOf<E extends EntryListSpec, N extends EntryKeys<E>> = {
  entries: N;
  type: "isNotMemberOf";
  isNotMemberOf: PODValueTupleForNamedEntries<E, N>[];
};

type SupportsRangeChecks = "int" | "cryptographic" | "date";

type InRange<
  E extends EntryListSpec,
  N extends keyof EntriesOfType<E, SupportsRangeChecks>
> = {
  entry: N;
  type: "inRange";
  inRange: {
    min: E[N]["type"] extends "date" ? Date : bigint;
    max: E[N]["type"] extends "date" ? Date : bigint;
  };
};

type NotInRange<
  E extends EntryListSpec,
  N extends keyof EntriesOfType<E, SupportsRangeChecks>
> = {
  entry: N;
  type: "notInRange";
  notInRange: {
    min: E[N]["type"] extends "date" ? Date : bigint;
    max: E[N]["type"] extends "date" ? Date : bigint;
  };
};

type EqualsEntry<
  E extends EntryListSpec,
  N1 extends keyof E,
  N2 extends keyof E
> = E[N2]["type"] extends E[N1]["type"]
  ? {
      entry: N1;
      type: "equalsEntry";
      equalsEntry: N2;
    }
  : never;

type NotEqualsEntry<
  E extends EntryListSpec,
  N1 extends keyof E,
  N2 extends keyof E
> = E[N2]["type"] extends E[N1]["type"]
  ? {
      entry: N1;
      type: "notEqualsEntry";
      notEqualsEntry: N2;
    }
  : never;

type Constraints =
  | IsMemberOf<any, any>
  | IsNotMemberOf<any, any>
  | InRange<any, any>
  | NotInRange<any, any>
  | EqualsEntry<any, any, any>
  | NotEqualsEntry<any, any, any>;

/**
 * Given a list of entry names, return the names of the entries that are not in the list
 */
type OmittedEntryNames<E extends EntryListSpec, N extends string[]> = Exclude<
  keyof E,
  N[number]
>;

type NonOverlappingConstraints<C extends ConstraintMap, N extends string[]> = {
  [K in keyof C as C[K] extends
    | IsMemberOf<any, infer Entries>
    | IsNotMemberOf<any, infer Entries>
    ? Entries[number] extends N[number]
      ? K
      : never
    : C[K] extends InRange<any, infer Entry>
      ? Entry extends N[number]
        ? K
        : never
      : C[K] extends NotInRange<any, infer Entry>
        ? Entry extends N[number]
          ? K
          : never
        : C[K] extends EqualsEntry<any, infer Entry1, infer Entry2>
          ? [Entry1, Entry2][number] extends N[number]
            ? K
            : never
          : C[K] extends NotEqualsEntry<any, infer Entry1, infer Entry2>
            ? [Entry1, Entry2][number] extends N[number]
              ? K
              : never
            : never]: C[K];
};

type Concrete<T> = T extends object ? { [K in keyof T]: T[K] } : T;

type AddEntry<
  E extends EntryListSpec,
  K extends keyof E,
  V extends PODValueType
> = Concrete<E & { [P in K]: { type: V } }>;

// Utility types for constraint naming
type JoinWithUnderscore<T extends readonly string[]> = T extends readonly [
  infer F extends string,
  ...infer R extends string[]
]
  ? R["length"] extends 0
    ? F
    : `${F}_${JoinWithUnderscore<R>}`
  : never;

type BaseConstraintName<
  N extends readonly string[],
  C extends Constraints["type"]
> = `${JoinWithUnderscore<N>}_${C}`;

type NextAvailableSuffix<
  Base extends string,
  C extends ConstraintMap
> = Base extends keyof C
  ? `${Base}_1` extends keyof C
    ? `${Base}_2` extends keyof C
      ? `${Base}_3`
      : `${Base}_2`
    : `${Base}_1`
  : Base;

type ConstraintName<
  N extends readonly string[],
  C extends Constraints["type"],
  Map extends ConstraintMap
> = NextAvailableSuffix<BaseConstraintName<N, C>, Map>;

// Base constraint map
export type ConstraintMap = Record<string, Constraints>;

export class PODSpecBuilderV2<
  E extends EntryListSpec,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  C extends ConstraintMap = {}
> {
  readonly #spec: PODSpecV2<E, C>;

  private constructor(spec: PODSpecV2<E, C>) {
    this.#spec = spec;
  }

  public static create() {
    return new PODSpecBuilderV2({
      entries: {},
      constraints: {}
    });
  }

  public spec(): PODSpecV2<E, C> {
    return structuredClone(this.#spec);
  }

  public entry<
    K extends string,
    V extends PODValueType,
    NewEntries extends AddEntry<E, K, V>
  >(key: Exclude<K, keyof E>, type: V): PODSpecBuilderV2<NewEntries, C> {
    // @todo handle existing entries?
    return new PODSpecBuilderV2({
      ...this.#spec,
      entries: {
        ...this.#spec.entries,
        [key]: { type }
      } as NewEntries,
      constraints: this.#spec.constraints
    });
  }

  /**
   * Pick entries by key
   */
  public pick<K extends keyof E & string>(
    keys: K[]
  ): PODSpecBuilderV2<Pick<E, K>, Concrete<NonOverlappingConstraints<C, K[]>>> {
    return new PODSpecBuilderV2({
      entries: Object.fromEntries(
        Object.entries(this.#spec.entries).filter(([key]) =>
          keys.includes(key as K)
        )
      ) as Pick<E, K>,
      constraints: Object.fromEntries(
        Object.entries(this.#spec.constraints).filter(([_key, constraint]) => {
          if (constraint.type === "isMemberOf") {
            return (constraint.entries as EntryKeys<E>).every((entry) =>
              keys.includes(entry as K)
            );
          } else if (constraint.type === "inRange") {
            return keys.includes(constraint.entry as K);
          }
          return false;
        })
      ) as Concrete<NonOverlappingConstraints<C, K[]>>
    });
  }

  /**
   * Add a constraint that the entries must be a member of a list of tuples
   *
   * The names must be an array of one or more entry names for the POD.
   * If there is only one name, then the values must be an array of PODValues
   * of the type for that entry.
   *
   * If there are multiple names, then the values must be an array of one or
   * more tuples, where each tuple is an array of PODValues of the type for
   * each entry, in the order matching the names array.
   *
   * @param names - The names of the entries to be constrained
   * @param values - The values to be constrained to
   * @returns A new PODSpecBuilderV2 with the constraint added
   */
  public isMemberOf<N extends EntryKeys<E & VirtualEntries>>(
    names: [...N],
    values: N["length"] extends 1
      ? PODValueTypeForEntry<
          (E & VirtualEntries)[N[0] & keyof (E & VirtualEntries)]
        >[]
      : PODValueTupleForNamedEntries<E & VirtualEntries, N>[]
  ): PODSpecBuilderV2<
    E,
    C & { [K in ConstraintName<N, "isMemberOf", C>]: IsMemberOf<E, N> }
  > {
    // Check that all names exist in entries
    for (const name of names) {
      if (!(name in this.#spec.entries) && !virtualEntryNames.has(name)) {
        throw new Error(`Entry "${name}" does not exist`);
      }
    }

    // Check for duplicate names
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      throw new Error("Duplicate entry names are not allowed");
    }

    const constraint: IsMemberOf<E, N> = {
      entries: names,
      type: "isMemberOf",
      // Wrap single values in arrays to match the expected tuple format
      isMemberOf: (names.length === 1
        ? // @todo handle virtual entries
          (values as PODValueTypeForEntry<E[N[0] & keyof E]>[]).map((v) => [v])
        : values) as PODValueTupleForNamedEntries<E, N>[]
    };

    const baseName = `${names.join("_")}_isMemberOf`;
    let constraintName = baseName;
    let suffix = 1;

    while (constraintName in this.#spec.constraints) {
      constraintName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilderV2({
      ...this.#spec,
      constraints: {
        ...this.#spec.constraints,
        [constraintName]: constraint
      }
    });
  }

  /**
   * Add a constraint that the entries must not be a member of a list of tuples
   *
   * The names must be an array of one or more entry names for the POD.
   * If there is only one name, then the values must be an array of PODValues
   * of the type for that entry.
   *
   * If there are multiple names, then the values must be an array of one or
   * more tuples, where each tuple is an array of PODValues of the type for
   * each entry, in the order matching the names array.
   *
   * @param names - The names of the entries to be constrained
   * @param values - The values to be constrained to
   * @returns A new PODSpecBuilderV2 with the constraint added
   */
  public isNotMemberOf<N extends EntryKeys<E>>(
    names: [...N],
    values: N["length"] extends 1
      ? PODValueTypeForEntry<E[N[0] & keyof E]>[]
      : PODValueTupleForNamedEntries<E, N>[]
  ): PODSpecBuilderV2<
    E,
    C & { [K in ConstraintName<N, "isNotMemberOf", C>]: IsNotMemberOf<E, N> }
  > {
    // Check that all names exist in entries
    for (const name of names) {
      if (!(name in this.#spec.entries)) {
        throw new Error(`Entry "${name}" does not exist`);
      }
    }

    // Check for duplicate names
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      throw new Error("Duplicate entry names are not allowed");
    }

    const constraint: IsNotMemberOf<E, N> = {
      entries: names,
      type: "isNotMemberOf",
      // Wrap single values in arrays to match the expected tuple format
      isNotMemberOf: (names.length === 1
        ? (values as PODValueTypeForEntry<E[N[0] & keyof E]>[]).map((v) => [v])
        : values) as PODValueTupleForNamedEntries<E, N>[]
    };

    const baseName = `${names.join("_")}_isNotMemberOf`;
    let constraintName = baseName;
    let suffix = 1;

    while (constraintName in this.#spec.constraints) {
      constraintName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilderV2({
      ...this.#spec,
      constraints: {
        ...this.#spec.constraints,
        [constraintName]: constraint
      }
    });
  }

  /**
   * Add a constraint that the entry must be in a range
   *
   * @param name - The name of the entry to be constrained
   * @param range - The range to be constrained to
   * @returns A new PODSpecBuilderV2 with the constraint added
   */
  public inRange<
    N extends keyof EntriesOfType<E, SupportsRangeChecks> & string
  >(
    name: N,
    range: {
      min: E[N]["type"] extends "date" ? Date : bigint;
      max: E[N]["type"] extends "date" ? Date : bigint;
    }
  ): PODSpecBuilderV2<
    E,
    C & { [K in ConstraintName<[N & string], "inRange", C>]: InRange<E, N> }
  > {
    // Check that the entry exists
    if (!(name in this.#spec.entries) && !virtualEntryNames.has(name)) {
      throw new Error(`Entry "${name}" does not exist`);
    }

    const entryType = this.#spec.entries[name]?.type;

    if (entryType === "int") {
      validateRange(
        range.min as bigint,
        range.max as bigint,
        POD_INT_MIN,
        POD_INT_MAX
      );
    } else if (entryType === "cryptographic") {
      validateRange(
        range.min as bigint,
        range.max as bigint,
        POD_CRYPTOGRAPHIC_MIN,
        POD_CRYPTOGRAPHIC_MAX
      );
    } else if (entryType === "date") {
      validateRange(
        range.min as Date,
        range.max as Date,
        POD_DATE_MIN,
        POD_DATE_MAX
      );
    }

    const constraint: InRange<E, N> = {
      entry: name,
      type: "inRange",
      inRange: range
    };

    const baseName = `${name}_inRange`;
    let constraintName = baseName;
    let suffix = 1;

    while (constraintName in this.#spec.constraints) {
      constraintName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilderV2({
      ...this.#spec,
      constraints: {
        ...this.#spec.constraints,
        [constraintName]: constraint
      }
    });
  }

  /**
   * Add a constraint that the entry must not be in a range
   *
   * @param name - The name of the entry to be constrained
   * @param range - The range to be constrained to
   * @returns A new PODSpecBuilderV2 with the constraint added
   */
  public notInRange<
    N extends keyof EntriesOfType<E, SupportsRangeChecks> & string
  >(
    name: N,
    range: {
      min: E[N]["type"] extends "date" ? Date : bigint;
      max: E[N]["type"] extends "date" ? Date : bigint;
    }
  ): PODSpecBuilderV2<
    E,
    C & {
      [K in ConstraintName<[N & string], "notInRange", C>]: NotInRange<E, N>;
    }
  > {
    // Check that the entry exists
    if (!(name in this.#spec.entries)) {
      throw new Error(`Entry "${name}" does not exist`);
    }

    const entryType = this.#spec.entries[name]?.type;

    if (entryType === "int") {
      validateRange(
        range.min as bigint,
        range.max as bigint,
        POD_INT_MIN,
        POD_INT_MAX
      );
    } else if (entryType === "cryptographic") {
      validateRange(
        range.min as bigint,
        range.max as bigint,
        POD_CRYPTOGRAPHIC_MIN,
        POD_CRYPTOGRAPHIC_MAX
      );
    } else if (entryType === "date") {
      validateRange(
        range.min as Date,
        range.max as Date,
        POD_DATE_MIN,
        POD_DATE_MAX
      );
    }

    const constraint: NotInRange<E, N> = {
      entry: name,
      type: "notInRange",
      notInRange: range
    };

    const baseName = `${name}_notInRange`;
    let constraintName = baseName;
    let suffix = 1;

    while (constraintName in this.#spec.constraints) {
      constraintName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilderV2({
      ...this.#spec,
      constraints: {
        ...this.#spec.constraints,
        [constraintName]: constraint
      }
    });
  }

  public equalsEntry<N1 extends keyof E & string, N2 extends keyof E & string>(
    name1: N1,
    name2: E[N2]["type"] extends E[N1]["type"] ? N2 : never
  ): PODSpecBuilderV2<
    E,
    C & {
      [K in ConstraintName<[N1, N2], "equalsEntry", C>]: EqualsEntry<E, N1, N2>;
    }
  > {
    // Check that both names exist in entries
    if (!(name1 in this.#spec.entries)) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (!(name2 in this.#spec.entries)) {
      throw new Error(`Entry "${name2}" does not exist`);
    }
    if ((name1 as string) === (name2 as string)) {
      throw new Error("Entry names must be different");
    }
    if (this.#spec.entries[name1]?.type !== this.#spec.entries[name2]?.type) {
      throw new Error("Entry types must be the same");
    }

    const constraint = {
      entry: name1,
      type: "equalsEntry",
      equalsEntry: name2
      // We know that the types are compatible, so we can cast to the correct type
    } as unknown as EqualsEntry<E, N1, N2>;

    const baseName = `${name1}_${name2}_equalsEntry`;
    let constraintName = baseName;
    let suffix = 1;

    while (constraintName in this.#spec.constraints) {
      constraintName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilderV2({
      ...this.#spec,
      constraints: {
        ...this.#spec.constraints,
        [constraintName]: constraint
      }
    });
  }

  public notEqualsEntry<
    N1 extends keyof E & string,
    N2 extends keyof E & string
  >(
    name1: N1,
    name2: E[N2]["type"] extends E[N1]["type"] ? N2 : never
  ): PODSpecBuilderV2<
    E,
    C & {
      [K in ConstraintName<[N1, N2], "notEqualsEntry", C>]: NotEqualsEntry<
        E,
        N1,
        N2
      >;
    }
  > {
    // Check that both names exist in entries
    if (!(name1 in this.#spec.entries)) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (!(name2 in this.#spec.entries)) {
      throw new Error(`Entry "${name2}" does not exist`);
    }
    if ((name1 as string) === (name2 as string)) {
      throw new Error("Entry names must be different");
    }
    if (this.#spec.entries[name1]?.type !== this.#spec.entries[name2]?.type) {
      throw new Error("Entry types must be the same");
    }

    const constraint = {
      entry: name1,
      type: "notEqualsEntry",
      notEqualsEntry: name2
      // We know that the types are compatible, so we can cast to the correct type
    } as unknown as NotEqualsEntry<E, N1, N2>;

    const baseName = `${name1}_${name2}_notEqualsEntry`;
    let constraintName = baseName;
    let suffix = 1;

    while (constraintName in this.#spec.constraints) {
      constraintName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilderV2({
      ...this.#spec,
      constraints: {
        ...this.#spec.constraints,
        [constraintName]: constraint
      }
    });
  }
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;
  it("PODSpecBuilderV2", () => {
    const a = PODSpecBuilderV2.create();
    const b = a.entry("a", "string").entry("b", "int");
    expect(b.spec().entries).toEqual({
      a: { type: "string" },
      b: { type: "int" }
    });

    const c = b.isMemberOf(["a"], [{ type: "string", value: "foo" }]);
    expect(c.spec().constraints).toEqual({
      a_isMemberOf: {
        entries: ["a"],
        type: "isMemberOf",
        isMemberOf: [[{ type: "string", value: "foo" }]]
      }
    });

    const d = c.inRange("b", { min: 10n, max: 100n });
    expect(d.spec().constraints).toEqual({
      a_isMemberOf: {
        entries: ["a"],
        type: "isMemberOf",
        isMemberOf: [[{ type: "string", value: "foo" }]]
      },
      b_inRange: {
        entry: "b",
        type: "inRange",
        inRange: { min: 10n, max: 100n }
      }
    });

    const e = d.isMemberOf(
      ["a", "b"],
      [
        [
          { type: "string", value: "foo" },
          { type: "int", value: 10n }
        ]
      ]
    );
    expect(e.spec().constraints.a_b_isMemberOf.entries).toEqual(["a", "b"]);

    const f = e.pick(["b"]);
    expect(f.spec().constraints).toEqual({
      b_inRange: {
        entry: "b",
        type: "inRange",
        inRange: { min: 10n, max: 100n }
      }
    });

    const g = e.entry("new", "string").equalsEntry("a", "new");
    const _GEntries = g.spec().entries;
    type EntriesType = typeof _GEntries;
    g.spec().constraints.a_new_equalsEntry satisfies EqualsEntry<
      EntriesType,
      "a",
      "new"
    >;

    expect(g.spec().constraints).toMatchObject({
      a_new_equalsEntry: {
        entry: "a",
        type: "equalsEntry",
        equalsEntry: "new"
      }
    });
  });
}

// Example entry list spec
type TestEntries = {
  a: { type: "string" };
  b: { type: "int" };
  c: { type: "int" };
};

// Example constraint map
type TestConstraints = {
  a_isMemberOf: IsMemberOf<TestEntries, ["a"]>;
  b_inRange: InRange<TestEntries, "b">;
  ac_isMemberOf: IsMemberOf<TestEntries, ["a", "c"]>;
};

// Let's test picking just 'a' and 'b'
type PickedKeys = ["b"];

// First, let's see what OmittedEntryNames gives us
type TestOmitted = OmittedEntryNames<TestEntries, PickedKeys>;
// Should be: "c"

// Now let's test NonOverlapping
type TestNonOverlapping = NonOverlappingConstraints<
  TestConstraints,
  PickedKeys
>;

// Let's see what we get when picking just 'a'
type TestPickA = NonOverlappingConstraints<TestConstraints, ["a"]>;
