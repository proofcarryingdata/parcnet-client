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
 - [ ] switch to using value types rather than PODValues (everywhere? maybe not membership lists)
 */

const virtualEntries: VirtualEntries = {
  $contentID: { type: "string" },
  $signature: { type: "string" },
  $signerPublicKey: { type: "eddsa_pubkey" }
};

type VirtualEntries = {
  $contentID: { type: "string" };
  $signature: { type: "string" };
  $signerPublicKey: { type: "eddsa_pubkey" };
};

export type PODSpecV2<E extends EntryTypes, S extends StatementMap> = {
  entries: E;
  statements: S;
};

export type EntryTypes = Record<PODName, PODValueType>;

export type EntryKeys<E extends EntryTypes> = (keyof E & string)[];

export type PODValueTupleForNamedEntries<
  E extends EntryTypes,
  Names extends EntryKeys<E>
> = {
  [K in keyof Names]: PODValueTypeFromTypeName<E[Names[K] & keyof E]>;
};

type PODValueTypeFromTypeName<T extends PODValueType> = Extract<
  PODValue,
  { type: T }
>;

type EntriesOfType<E extends EntryTypes, T extends PODValueType> = {
  [P in keyof E as E[P] extends T ? P & string : never]: E[P];
};

/**
 * @TODO Consider not having the E type parameter here.
 * We can practically constrain the entry names using the constraint method
 * signature, and then store a lighter-weight type that just lists the entry
 * names used, without keeping a reference to the entry type list.
 */

type IsMemberOf<E extends EntryTypes, N extends EntryKeys<E>> = {
  entries: N;
  type: "isMemberOf";
  isMemberOf: PODValueTupleForNamedEntries<E, N>[];
};

type IsNotMemberOf<E extends EntryTypes, N extends EntryKeys<E>> = {
  entries: N;
  type: "isNotMemberOf";
  isNotMemberOf: PODValueTupleForNamedEntries<E, N>[];
};

type SupportsRangeChecks = "int" | "cryptographic" | "date";

type InRange<
  E extends EntryTypes,
  N extends keyof EntriesOfType<E, SupportsRangeChecks>
> = {
  entry: N;
  type: "inRange";
  inRange: {
    min: E[N] extends "date" ? Date : bigint;
    max: E[N] extends "date" ? Date : bigint;
  };
};

type NotInRange<
  E extends EntryTypes,
  N extends keyof EntriesOfType<E, SupportsRangeChecks>
> = {
  entry: N;
  type: "notInRange";
  notInRange: {
    min: E[N] extends "date" ? Date : bigint;
    max: E[N] extends "date" ? Date : bigint;
  };
};

type EqualsEntry<
  E extends EntryTypes,
  N1 extends keyof E,
  N2 extends keyof E
> = E[N2] extends E[N1]
  ? {
      entry: N1;
      type: "equalsEntry";
      equalsEntry: N2;
    }
  : never;

type NotEqualsEntry<
  E extends EntryTypes,
  N1 extends keyof E,
  N2 extends keyof E
> = E[N2] extends E[N1]
  ? {
      entry: N1;
      type: "notEqualsEntry";
      notEqualsEntry: N2;
    }
  : never;

type Statements =
  | IsMemberOf<any, any>
  | IsNotMemberOf<any, any>
  | InRange<any, any>
  | NotInRange<any, any>
  | EqualsEntry<any, any, any>
  | NotEqualsEntry<any, any, any>;

/**
 * Given a list of entry names, return the names of the entries that are not in the list
 */
type OmittedEntryNames<E extends EntryTypes, N extends string[]> = Exclude<
  keyof E,
  N[number]
>;

type NonOverlappingStatements<S extends StatementMap, N extends string[]> = {
  [K in keyof S as S[K] extends
    | IsMemberOf<any, infer Entries>
    | IsNotMemberOf<any, infer Entries>
    ? Entries[number] extends N[number]
      ? K
      : never
    : S[K] extends InRange<any, infer Entry>
      ? Entry extends N[number]
        ? K
        : never
      : S[K] extends NotInRange<any, infer Entry>
        ? Entry extends N[number]
          ? K
          : never
        : S[K] extends EqualsEntry<any, infer Entry1, infer Entry2>
          ? [Entry1, Entry2][number] extends N[number]
            ? K
            : never
          : S[K] extends NotEqualsEntry<any, infer Entry1, infer Entry2>
            ? [Entry1, Entry2][number] extends N[number]
              ? K
              : never
            : never]: S[K];
};

type Concrete<T> = T extends object ? { [K in keyof T]: T[K] } : T;

type AddEntry<
  E extends EntryTypes,
  K extends keyof E,
  V extends PODValueType
> = Concrete<E & { [P in K]: V }>;

// Utility types for statement naming
type JoinWithUnderscore<T extends readonly string[]> = T extends readonly [
  infer F extends string,
  ...infer R extends string[]
]
  ? R["length"] extends 0
    ? F
    : `${F}_${JoinWithUnderscore<R>}`
  : never;

type BaseStatementName<
  N extends readonly string[],
  S extends Statements["type"]
> = `${JoinWithUnderscore<N>}_${S}`;

type NextAvailableSuffix<
  Base extends string,
  S extends StatementMap
> = Base extends keyof S
  ? `${Base}_1` extends keyof S
    ? `${Base}_2` extends keyof S
      ? `${Base}_3`
      : `${Base}_2`
    : `${Base}_1`
  : Base;

type StatementName<
  N extends readonly string[],
  S extends Statements["type"],
  Map extends StatementMap
> = NextAvailableSuffix<BaseStatementName<N, S>, Map>;

// Base constraint map
export type StatementMap = Record<string, Statements>;

export class PODSpecBuilderV2<
  E extends EntryTypes,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  S extends StatementMap = {}
> {
  readonly #spec: PODSpecV2<E, S>;

  private constructor(spec: PODSpecV2<E, S>) {
    this.#spec = spec;
  }

  public static create() {
    return new PODSpecBuilderV2({
      entries: {},
      statements: {}
    });
  }

  public spec(): PODSpecV2<E, S> {
    return structuredClone(this.#spec);
  }

  public entry<
    K extends string,
    V extends PODValueType,
    NewEntries extends AddEntry<E, K, V>
  >(key: Exclude<K, keyof E>, type: V): PODSpecBuilderV2<NewEntries, S> {
    // @todo handle existing entries?
    return new PODSpecBuilderV2({
      ...this.#spec,
      entries: {
        ...this.#spec.entries,
        [key]: type
      } as NewEntries,
      statements: this.#spec.statements
    });
  }

  /**
   * Pick entries by key
   */
  public pick<K extends keyof E & string>(
    keys: K[]
  ): PODSpecBuilderV2<Pick<E, K>, Concrete<NonOverlappingStatements<S, K[]>>> {
    return new PODSpecBuilderV2({
      entries: Object.fromEntries(
        Object.entries(this.#spec.entries).filter(([key]) =>
          keys.includes(key as K)
        )
      ) as Pick<E, K>,
      statements: Object.fromEntries(
        Object.entries(this.#spec.statements).filter(([_key, statement]) => {
          if (statement.type === "isMemberOf") {
            return (statement.entries as EntryKeys<E>).every((entry) =>
              keys.includes(entry as K)
            );
          } else if (statement.type === "inRange") {
            return keys.includes(statement.entry as K);
          }
          return false;
        })
      ) as Concrete<NonOverlappingStatements<S, K[]>>
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
      ? PODValueTypeFromTypeName<
          (E & VirtualEntries)[N[0] & keyof (E & VirtualEntries)]
        >[]
      : PODValueTupleForNamedEntries<E & VirtualEntries, N>[]
  ): PODSpecBuilderV2<
    E,
    S & { [K in StatementName<N, "isMemberOf", S>]: IsMemberOf<E, N> }
  > {
    // Check that all names exist in entries
    for (const name of names) {
      if (!(name in this.#spec.entries) && !(name in virtualEntries)) {
        throw new Error(`Entry "${name}" does not exist`);
      }
    }

    // Check for duplicate names
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      throw new Error("Duplicate entry names are not allowed");
    }

    const statement: IsMemberOf<E, N> = {
      entries: names,
      type: "isMemberOf",
      // Wrap single values in arrays to match the expected tuple format
      isMemberOf: (names.length === 1
        ? // @todo handle virtual entries
          (values as PODValueTypeFromTypeName<E[N[0] & keyof E]>[]).map((v) => [
            v
          ])
        : values) as PODValueTupleForNamedEntries<E, N>[]
    };

    const baseName = `${names.join("_")}_isMemberOf`;
    let statementName = baseName;
    let suffix = 1;

    while (statementName in this.#spec.statements) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilderV2({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
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
      ? PODValueTypeFromTypeName<E[N[0] & keyof E]>[]
      : PODValueTupleForNamedEntries<E, N>[]
  ): PODSpecBuilderV2<
    E,
    S & { [K in StatementName<N, "isNotMemberOf", S>]: IsNotMemberOf<E, N> }
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

    const statement: IsNotMemberOf<E, N> = {
      entries: names,
      type: "isNotMemberOf",
      // Wrap single values in arrays to match the expected tuple format
      isNotMemberOf: (names.length === 1
        ? (values as PODValueTypeFromTypeName<E[N[0] & keyof E]>[]).map((v) => [
            v
          ])
        : values) as PODValueTupleForNamedEntries<E, N>[]
    };

    const baseName = `${names.join("_")}_isNotMemberOf`;
    let statementName = baseName;
    let suffix = 1;

    while (statementName in this.#spec.statements) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilderV2({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
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
      min: E[N] extends "date" ? Date : bigint;
      max: E[N] extends "date" ? Date : bigint;
    }
  ): PODSpecBuilderV2<
    E,
    S & { [K in StatementName<[N & string], "inRange", S>]: InRange<E, N> }
  > {
    // Check that the entry exists
    if (!(name in this.#spec.entries) && !(name in virtualEntries)) {
      throw new Error(`Entry "${name}" does not exist`);
    }

    const entryType = this.#spec.entries[name];

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

    const statement: InRange<E, N> = {
      entry: name,
      type: "inRange",
      inRange: range
    };

    const baseName = `${name}_inRange`;
    let statementName = baseName;
    let suffix = 1;

    while (statementName in this.#spec.statements) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilderV2({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
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
      min: E[N] extends "date" ? Date : bigint;
      max: E[N] extends "date" ? Date : bigint;
    }
  ): PODSpecBuilderV2<
    E,
    S & {
      [K in StatementName<[N & string], "notInRange", S>]: NotInRange<E, N>;
    }
  > {
    // Check that the entry exists
    if (!(name in this.#spec.entries) && !(name in virtualEntries)) {
      throw new Error(`Entry "${name}" does not exist`);
    }

    const entryType = this.#spec.entries[name];

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

    const statement: NotInRange<E, N> = {
      entry: name,
      type: "notInRange",
      notInRange: range
    };

    const baseName = `${name}_notInRange`;
    let statementName = baseName;
    let suffix = 1;

    while (statementName in this.#spec.statements) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilderV2({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
      }
    });
  }

  public equalsEntry<N1 extends keyof E & string, N2 extends keyof E & string>(
    name1: N1,
    name2: E[N2] extends E[N1] ? N2 : never
  ): PODSpecBuilderV2<
    E,
    S & {
      [K in StatementName<[N1, N2], "equalsEntry", S>]: EqualsEntry<E, N1, N2>;
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
    if ((this.#spec.entries[name1] as string) !== this.#spec.entries[name2]) {
      throw new Error("Entry types must be the same");
    }

    const statement = {
      entry: name1,
      type: "equalsEntry",
      equalsEntry: name2
      // We know that the types are compatible, so we can cast to the correct type
    } as unknown as EqualsEntry<E, N1, N2>;

    const baseName = `${name1}_${name2}_equalsEntry`;
    let statementName = baseName;
    let suffix = 1;

    while (statementName in this.#spec.statements) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilderV2({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
      }
    });
  }

  public notEqualsEntry<
    N1 extends keyof E & string,
    N2 extends keyof E & string
  >(
    name1: N1,
    name2: E[N2] extends E[N1] ? N2 : never
  ): PODSpecBuilderV2<
    E,
    S & {
      [K in StatementName<[N1, N2], "notEqualsEntry", S>]: NotEqualsEntry<
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
    if ((this.#spec.entries[name1] as string) !== this.#spec.entries[name2]) {
      throw new Error("Entry types must be the same");
    }

    const statement = {
      entry: name1,
      type: "notEqualsEntry",
      notEqualsEntry: name2
      // We know that the types are compatible, so we can cast to the correct type
    } as unknown as NotEqualsEntry<E, N1, N2>;

    const baseName = `${name1}_${name2}_notEqualsEntry`;
    let statementName = baseName;
    let suffix = 1;

    while (statementName in this.#spec.statements) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilderV2({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
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
    expect(c.spec().statements).toEqual({
      a_isMemberOf: {
        entries: ["a"],
        type: "isMemberOf",
        isMemberOf: [[{ type: "string", value: "foo" }]]
      }
    });

    const d = c.inRange("b", { min: 10n, max: 100n });
    expect(d.spec().statements).toEqual({
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
    expect(e.spec().statements.a_b_isMemberOf.entries).toEqual(["a", "b"]);

    const f = e.pick(["b"]);
    expect(f.spec().statements).toEqual({
      b_inRange: {
        entry: "b",
        type: "inRange",
        inRange: { min: 10n, max: 100n }
      }
    });

    const g = e.entry("new", "string").equalsEntry("a", "new");
    const _GEntries = g.spec().entries;
    type EntriesType = typeof _GEntries;
    g.spec().statements.a_new_equalsEntry satisfies EqualsEntry<
      EntriesType,
      "a",
      "new"
    >;

    expect(g.spec().statements).toMatchObject({
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

// Example statement map
type TestStatements = {
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
type TestNonOverlapping = NonOverlappingStatements<TestStatements, PickedKeys>;

// Let's see what we get when picking just 'a'
type TestPickA = NonOverlappingStatements<TestStatements, ["a"]>;
