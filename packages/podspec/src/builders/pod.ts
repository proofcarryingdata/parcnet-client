import {
  checkPODName,
  POD_DATE_MAX,
  POD_DATE_MIN,
  POD_INT_MAX,
  POD_INT_MIN
} from "@pcd/pod";
import {
  convertValuesToStringTuples,
  deepFreeze,
  supportsRangeChecks,
  validateRange
} from "./shared.js";
import type {
  IsMemberOf,
  IsNotMemberOf,
  InRange,
  NotInRange,
  EqualsEntry,
  NotEqualsEntry,
  SupportsRangeChecks,
  StatementName,
  StatementMap,
  GreaterThan,
  GreaterThanEq,
  LessThan,
  LessThanEq
} from "./types/statements.js";
import type {
  EntriesOfType,
  EntryKeys,
  EntryTypes,
  PODValueTupleForNamedEntries,
  PODValueType,
  PODValueTypeFromTypeName,
  VirtualEntries
} from "./types/entries.js";
import canonicalize from "canonicalize/lib/canonicalize.js";
import type { IsJsonSafe } from "../shared/jsonSafe.js";

/**
 @todo
 - [x] add lessThan, greaterThan, lessThanEq, greaterThanEq
 - [ ] add omit
 - [x] maybe add pick/omit for statements?
 - [x] add signerPublicKey support (done at type level, not run-time)
 - [ ] add constraints on signature
 - [x] add contentID virtual entry (done at type level, not run-time)
 - [ ] refactor types (also delete unused types in types dir)
 - [x] rename away from v2 suffix
 - [x] validate entry names
 - [x] validate isMemberOf/isNotMemberOf parameters
 - [ ] handle multiple/incompatible range checks on the same entry
 - [x] switch to using value types rather than PODValues (everywhere? maybe not membership lists)
 - [ ] better error messages
 - [ ] consider adding a hash to the spec to prevent tampering
 */

function canonicalizeJSON(input: unknown): string | undefined {
  // Something is screwy with the typings for canonicalize
  return (canonicalize as unknown as (input: unknown) => string | undefined)(
    input
  );
}

export const virtualEntries: VirtualEntries = {
  $contentID: "string",
  $signature: "string",
  $signerPublicKey: "eddsa_pubkey"
};

export type PODSpec<E extends EntryTypes, S extends StatementMap> = {
  entries: E;
  statements: S;
};

// This is a compile-time check that the PODSpec is JSON-safe
true satisfies IsJsonSafe<PODSpec<EntryTypes, StatementMap>>;

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

  public toJSON(): string {
    const canonicalized = canonicalizeJSON(this.#spec);
    if (!canonicalized) {
      throw new Error("Failed to canonicalize PODSpec");
    }
    return JSON.stringify(
      {
        ...this.#spec,
        hash: canonicalized /* TODO hashing! */
      },
      null,
      2
    );
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
            case "notEqualsEntry":
            case "greaterThan":
            case "greaterThanEq":
            case "lessThan":
            case "lessThanEq":
              return (
                keys.includes(statement.entry as K) &&
                keys.includes(statement.otherEntry as K)
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
    S & {
      [K in StatementName<N, "isMemberOf", S>]: IsMemberOf<
        E & VirtualEntries,
        N
      >;
    }
  > {
    // Check for duplicate names
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      throw new Error("Duplicate entry names are not allowed");
    }

    const allEntries = {
      ...this.#spec.entries,
      ...virtualEntries
    };

    for (const name of names) {
      if (!(name in allEntries)) {
        throw new Error(`Entry "${name}" does not exist`);
      }
    }

    /**
     * We want type-safe inputs, but we want JSON-safe data to persist in the
     * spec. So, we convert the input values to strings - because we have the
     * POD type information, we can convert back to the correct type when we
     * read the spec.
     *
     * For readability, we also have a special-case on inputs, where if there
     * is only one entry being matched on, we accept a list in the form of
     * value[] instead of [value][] - an array of plain values instead of an
     * array of one-element tuples. When persisting, however, we convert these
     * to one-element tuples since this makes reading the data out later more
     * efficient.
     */
    const statement: IsMemberOf<E & VirtualEntries, N> = {
      entries: names,
      type: "isMemberOf",
      isMemberOf: convertValuesToStringTuples<N>(names, values, allEntries)
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

    const allEntries = {
      ...this.#spec.entries,
      ...virtualEntries
    };

    for (const name of names) {
      if (!(name in allEntries)) {
        throw new Error(`Entry "${name}" does not exist`);
      }
    }

    /**
     * We want type-safe inputs, but we want JSON-safe data to persist in the
     * spec. So, we convert the input values to strings - because we have the
     * POD type information, we can convert back to the correct type when we
     * read the spec.
     *
     * For readability, we also have a special-case on inputs, where if there
     * is only one entry being matched on, we accept a list in the form of
     * value[] instead of [value][] - an array of plain values instead of an
     * array of one-element tuples. When persisting, however, we convert these
     * to one-element tuples since this makes reading the data out later more
     * efficient.
     */
    const statement: IsNotMemberOf<E & VirtualEntries, N> = {
      entries: names,
      type: "isNotMemberOf",
      isNotMemberOf: convertValuesToStringTuples<N>(names, values, allEntries)
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
      inRange: {
        min:
          range.min instanceof Date
            ? range.min.getTime().toString()
            : range.min.toString(),
        max:
          range.max instanceof Date
            ? range.max.getTime().toString()
            : range.max.toString()
      }
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

    const entryType = this.#spec.entries[name]!;

    if (!supportsRangeChecks(entryType)) {
      throw new Error(`Entry "${name}" does not support range checks`);
    }

    // TODO repetition, consider moving to a utility function
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

    const statement: NotInRange<E, N> = {
      entry: name,
      type: "notInRange",
      notInRange: {
        min:
          range.min instanceof Date
            ? range.min.getTime().toString()
            : range.min.toString(),
        max:
          range.max instanceof Date
            ? range.max.getTime().toString()
            : range.max.toString()
      }
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
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string
  >(
    name1: N1,
    name2: Exclude<N2, N1>
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
      otherEntry: name2
    } satisfies EqualsEntry<E, N1, N2>;

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
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string
  >(
    name1: N1,
    name2: Exclude<N2, N1>
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
      otherEntry: name2
    } satisfies NotEqualsEntry<E, N1, N2>;

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

  public greaterThan<
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string
  >(
    name1: N1,
    name2: Exclude<N2, N1>
  ): PODSpecBuilder<
    E,
    S & {
      [K in StatementName<[N1, N2], "greaterThan", S>]: GreaterThan<E, N1, N2>;
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
      type: "greaterThan",
      otherEntry: name2
    } satisfies GreaterThan<E, N1, N2>;

    const baseName = `${name1}_${name2}_greaterThan`;
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

  public greaterThanEq<
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string
  >(
    name1: N1,
    name2: Exclude<N2, N1>
  ): PODSpecBuilder<
    E,
    S & {
      [K in StatementName<[N1, N2], "greaterThanEq", S>]: GreaterThanEq<
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
      type: "greaterThanEq",
      otherEntry: name2
    } satisfies GreaterThanEq<E, N1, N2>;

    const baseName = `${name1}_${name2}_greaterThanEq`;
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

  public lessThan<
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string
  >(
    name1: N1,
    name2: Exclude<N2, N1>
  ): PODSpecBuilder<
    E,
    S & {
      [K in StatementName<[N1, N2], "lessThan", S>]: LessThan<E, N1, N2>;
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
      type: "lessThan",
      otherEntry: name2
    } satisfies LessThan<E, N1, N2>;

    const baseName = `${name1}_${name2}_lessThan`;
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

  public lessThanEq<
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string
  >(
    name1: N1,
    name2: Exclude<N2, N1>
  ): PODSpecBuilder<
    E,
    S & {
      [K in StatementName<[N1, N2], "lessThanEq", S>]: LessThanEq<E, N1, N2>;
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
      type: "lessThanEq",
      otherEntry: name2
    } satisfies LessThanEq<E, N1, N2>;

    const baseName = `${name1}_${name2}_lessThanEq`;
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
