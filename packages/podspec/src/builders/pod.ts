import {
  checkPODName,
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
import { deepFreeze, validateRange } from "./shared.js";

/**
 @todo
 - [ ] add lessThan, greaterThan, lessThanEq, greaterThanEq
 - [ ] add omit
 - [x] maybe add pick/omit for statements?
 - [x] add signerPublicKey support (done at type level, not run-time)
 - [ ] add constraints on signature
 - [x] add contentID virtual entry (done at type level, not run-time)
 - [ ] refactor types (also delete unused types in types dir)
 - [x] rename away from v2 suffix
 - [x] validate entry names
 - [ ] validate isMemberOf/isNotMemberOf parameters
 - [ ] handle multiple/incompatible range checks on the same entry
 - [x] switch to using value types rather than PODValues (everywhere? maybe not membership lists)
 - [ ] better error messages
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

export type PODSpec<E extends EntryTypes, S extends StatementMap> = {
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
>["value"];

type EntriesOfType<E extends EntryTypes, T extends PODValueType> = {
  [P in keyof E as E[P] extends T ? P & string : never]: E[P];
};

/**
 * @TODO Consider not having the E type parameter here.
 * We can practically constrain the entry names using the constraint method
 * signature, and then store a lighter-weight type that just lists the entry
 * names used, without keeping a reference to the entry type list.
 */

type IsMemberOf<E extends EntryTypes, N extends EntryKeys<E> & string[]> = {
  entries: N;
  type: "isMemberOf";
  isMemberOf: PODValueTupleForNamedEntries<E & VirtualEntries, N>[];
};

type IsNotMemberOf<E extends EntryTypes, N extends EntryKeys<E>> = {
  entries: N;
  type: "isNotMemberOf";
  isNotMemberOf: PODValueTupleForNamedEntries<E & VirtualEntries, N>[];
};

type SupportsRangeChecks = "int" | "boolean" | "date";
type DoesNotSupportRangeChecks = Exclude<PODValueType, SupportsRangeChecks>;

function supportsRangeChecks(type: PODValueType): type is SupportsRangeChecks {
  switch (type) {
    case "int":
    case "boolean":
    case "date":
      return true;
    default:
      // Verify the narrowed type matches DoesNotSupportRangeChecks exactly
      // prettier-ignore
      (type) satisfies DoesNotSupportRangeChecks;
      return false;
  }
}

type InRange<
  E extends EntryTypes,
  N extends keyof EntriesOfType<E & VirtualEntries, SupportsRangeChecks>
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
  N extends keyof EntriesOfType<E & VirtualEntries, SupportsRangeChecks>
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
  N1 extends keyof (E & VirtualEntries),
  N2 extends keyof (E & VirtualEntries)
> = E[N2] extends E[N1]
  ? {
      entry: N1;
      type: "equalsEntry";
      equalsEntry: N2;
    }
  : never;

type NotEqualsEntry<
  E extends EntryTypes,
  N1 extends keyof (E & VirtualEntries),
  N2 extends keyof (E & VirtualEntries)
> = E[N2] extends E[N1]
  ? {
      entry: N1;
      type: "notEqualsEntry";
      notEqualsEntry: N2;
    }
  : never;

type Statements =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | IsMemberOf<any, string[]>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | IsNotMemberOf<any, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | InRange<any, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | NotInRange<any, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | EqualsEntry<any, any, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | NotEqualsEntry<any, any, any>;

/**
 * Given a list of entry names, return the names of the entries that are not in the list
 */
type OmittedEntryNames<E extends EntryTypes, N extends string[]> = Exclude<
  keyof E,
  N[number]
>;

type NonOverlappingStatements<S extends StatementMap, N extends string[]> = {
  [K in keyof S as S[K] extends // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | IsMemberOf<any, infer Entries>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | IsNotMemberOf<any, infer Entries>
    ? Entries[number] extends N[number]
      ? K
      : never
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      S[K] extends InRange<any, infer Entry>
      ? Entry extends N[number]
        ? K
        : never
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        S[K] extends NotInRange<any, infer Entry>
        ? Entry extends N[number]
          ? K
          : never
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          S[K] extends EqualsEntry<any, infer Entry1, infer Entry2>
          ? [Entry1, Entry2][number] extends N[number]
            ? K
            : never
          : // eslint-disable-next-line @typescript-eslint/no-explicit-any
            S[K] extends NotEqualsEntry<any, infer Entry1, infer Entry2>
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

export class PODSpecBuilder<
  E extends EntryTypes,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  S extends StatementMap = {}
> {
  readonly #spec: PODSpec<E, S>;

  private constructor(spec: PODSpec<E, S>) {
    this.#spec = spec;
  }

  public static create() {
    return new PODSpecBuilder({
      entries: {},
      statements: {}
    });
  }

  public spec(): PODSpec<E, S> {
    return deepFreeze(this.#spec);
  }

  public entry<
    K extends string,
    V extends PODValueType,
    NewEntries extends AddEntry<E, K, V>
  >(key: Exclude<K, keyof E>, type: V): PODSpecBuilder<NewEntries, S> {
    if (key in this.#spec.entries) {
      throw new Error(`Entry "${key}" already exists`);
    }

    // Will throw if not a valid POD entry name
    checkPODName(key);

    return new PODSpecBuilder({
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
  ): PODSpecBuilder<Pick<E, K>, Concrete<NonOverlappingStatements<S, K[]>>> {
    return new PODSpecBuilder({
      entries: Object.fromEntries(
        Object.entries(this.#spec.entries).filter(([key]) =>
          keys.includes(key as K)
        )
      ) as Pick<E, K>,
      statements: Object.fromEntries(
        Object.entries(this.#spec.statements).filter(([_key, statement]) => {
          const statementType = statement.type;
          switch (statementType) {
            case "isMemberOf":
            case "isNotMemberOf":
              return (statement.entries as EntryKeys<E>).every((entry) =>
                keys.includes(entry as K)
              );
            case "inRange":
            case "notInRange":
              return keys.includes(statement.entry as K);
            case "equalsEntry":
              return (
                keys.includes(statement.entry as K) &&
                keys.includes(statement.equalsEntry as K)
              );
            case "notEqualsEntry":
              return (
                keys.includes(statement.entry as K) &&
                keys.includes(statement.notEqualsEntry as K)
              );
            default:
              const _exhaustiveCheck: never = statement;
              throw new Error(
                `Unsupported statement type: ${statementType as string}`
              );
          }
        })
      ) as Concrete<NonOverlappingStatements<S, K[]>>
    });
  }

  public pickStatements<K extends keyof S>(
    keys: K[]
  ): PODSpecBuilder<E, Concrete<Pick<S, K>>> {
    return new PODSpecBuilder({
      ...this.#spec,
      statements: Object.fromEntries(
        Object.entries(this.#spec.statements).filter(([key]) =>
          keys.includes(key as K)
        )
      ) as Concrete<Pick<S, K>>
    });
  }

  public omitStatements<K extends keyof S>(
    keys: K[]
  ): PODSpecBuilder<E, Concrete<Omit<S, K>>> {
    return new PODSpecBuilder({
      ...this.#spec,
      statements: Object.fromEntries(
        Object.entries(this.#spec.statements).filter(
          ([key]) => !keys.includes(key as K)
        )
      ) as Concrete<Omit<S, K>>
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
   * @returns A new PODSpecBuilder with the statement added
   */
  public isMemberOf<N extends EntryKeys<E & VirtualEntries>>(
    names: [...N],
    values: N["length"] extends 1
      ? PODValueTypeFromTypeName<
          (E & VirtualEntries)[N[0] & keyof (E & VirtualEntries)]
        >[]
      : PODValueTupleForNamedEntries<E & VirtualEntries, N>[]
  ): PODSpecBuilder<
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
        ? (
            values as PODValueTypeFromTypeName<
              (E & VirtualEntries)[N[0] & keyof (E & VirtualEntries)]
            >[]
          ).map((v) => [v])
        : values) as PODValueTupleForNamedEntries<E & VirtualEntries, N>[]
    };

    const baseName = `${names.join("_")}_isMemberOf`;
    let statementName = baseName;
    let suffix = 1;

    while (statementName in this.#spec.statements) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilder({
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
   * @returns A new PODSpecBuilder with the statement added
   */
  public isNotMemberOf<N extends EntryKeys<E>>(
    names: [...N],
    values: N["length"] extends 1
      ? PODValueTypeFromTypeName<
          (E & VirtualEntries)[N[0] & keyof (E & VirtualEntries)]
        >[]
      : PODValueTupleForNamedEntries<E & VirtualEntries, N>[]
  ): PODSpecBuilder<
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
        ? (
            values as PODValueTypeFromTypeName<
              (E & VirtualEntries)[N[0] & keyof (E & VirtualEntries)]
            >[]
          ).map((v) => [v])
        : values) as PODValueTupleForNamedEntries<E & VirtualEntries, N>[]
    };

    const baseName = `${names.join("_")}_isNotMemberOf`;
    let statementName = baseName;
    let suffix = 1;

    while (statementName in this.#spec.statements) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilder({
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
   * @returns A new PODSpecBuilder with the statement added
   */
  public inRange<
    N extends keyof EntriesOfType<E, SupportsRangeChecks> & string
  >(
    name: N,
    range: {
      min: E[N] extends "date" ? Date : bigint;
      max: E[N] extends "date" ? Date : bigint;
    }
  ): PODSpecBuilder<
    E,
    S & { [K in StatementName<[N & string], "inRange", S>]: InRange<E, N> }
  > {
    // Check that the entry exists
    if (!(name in this.#spec.entries) && !(name in virtualEntries)) {
      throw new Error(`Entry "${name}" does not exist`);
    }

    const entryType = this.#spec.entries[name]!;

    if (!supportsRangeChecks(entryType)) {
      throw new Error(`Entry "${name}" does not support range checks`);
    }

    switch (entryType) {
      case "int":
        validateRange(
          range.min as bigint,
          range.max as bigint,
          POD_INT_MIN,
          POD_INT_MAX
        );
        break;
      case "boolean":
        validateRange(range.min as bigint, range.max as bigint, 0n, 1n);
        break;
      case "date":
        validateRange(
          range.min as Date,
          range.max as Date,
          POD_DATE_MIN,
          POD_DATE_MAX
        );
        break;
      default:
        const _exhaustiveCheck: never = entryType;
        throw new Error(`Unsupported entry type: ${name}`);
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

    return new PODSpecBuilder({
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
   * @returns A new PODSpecBuilder with the statement added
   */
  public notInRange<
    N extends keyof EntriesOfType<E, SupportsRangeChecks> & string
  >(
    name: N,
    range: {
      min: E[N] extends "date" ? Date : bigint;
      max: E[N] extends "date" ? Date : bigint;
    }
  ): PODSpecBuilder<
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

    return new PODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
      }
    });
  }

  public equalsEntry<
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof (E & VirtualEntries) & string
  >(
    name1: N1,
    name2: E[N2] extends E[N1] ? N2 : never
  ): PODSpecBuilder<
    E,
    S & {
      [K in StatementName<[N1, N2], "equalsEntry", S>]: EqualsEntry<E, N1, N2>;
    }
  > {
    // Check that both names exist in entries
    if (!(name1 in this.#spec.entries) && !(name1 in virtualEntries)) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (!(name2 in this.#spec.entries) && !(name2 in virtualEntries)) {
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

    return new PODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
      }
    });
  }

  public notEqualsEntry<
    N1 extends keyof E & VirtualEntries & string,
    N2 extends keyof E & VirtualEntries & string
  >(
    name1: N1,
    name2: E[N2] extends E[N1] ? N2 : never
  ): PODSpecBuilder<
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
    if (!(name1 in this.#spec.entries) && !(name1 in virtualEntries)) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (!(name2 in this.#spec.entries) && !(name2 in virtualEntries)) {
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

    return new PODSpecBuilder({
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
  it("PODSpecBuilder", () => {
    const a = PODSpecBuilder.create();
    const b = a.entry("a", "string").entry("b", "int");
    expect(b.spec().entries).toEqual({
      a: "string",
      b: "int"
    });

    const c = b.isMemberOf(["a"], ["foo"]);
    expect(c.spec().statements).toEqual({
      a_isMemberOf: {
        entries: ["a"],
        type: "isMemberOf",
        isMemberOf: [["foo"]]
      }
    });

    const d = c.inRange("b", { min: 10n, max: 100n });
    expect(d.spec().statements).toEqual({
      a_isMemberOf: {
        entries: ["a"],
        type: "isMemberOf",
        isMemberOf: [["foo"]]
      },
      b_inRange: {
        entry: "b",
        type: "inRange",
        inRange: { min: 10n, max: 100n }
      }
    });

    const e = d.isMemberOf(["a", "b"], [["foo", 10n]]);
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

    const h = g.pickStatements(["a_isMemberOf"]);
    expect(h.spec().statements).toEqual({
      a_isMemberOf: {
        entries: ["a"],
        type: "isMemberOf",
        isMemberOf: [["foo"]]
      }
    });
  });
}

// Example entry list spec
type TestEntries = {
  a: "string";
  b: "int";
  c: "int";
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
