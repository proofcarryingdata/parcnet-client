import {
  POD_DATE_MAX,
  POD_DATE_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  checkPODName,
} from "@pcd/pod";
import type { IsJsonSafe } from "../shared/jsonSafe.js";
import type { IsSingleLiteralString } from "../shared/types.js";
import {
  convertValuesToStringTuples,
  deepFreeze,
  supportsRangeChecks,
  validateRange,
} from "./shared.js";
import type {
  EntriesOfType,
  EntryKeys,
  EntryTypes,
  PODValueTupleForNamedEntries,
  PODValueType,
  PODValueTypeFromTypeName,
  VirtualEntries,
} from "./types/entries.js";
import type {
  EntriesWithRangeChecks,
  EqualsEntry,
  GreaterThan,
  GreaterThanEq,
  InRange,
  IsMemberOf,
  IsNotMemberOf,
  LessThan,
  LessThanEq,
  NotEqualsEntry,
  NotInRange,
  StatementMap,
  StatementName,
} from "./types/statements.js";

/**
 @todo
 - [x] add lessThan, greaterThan, lessThanEq, greaterThanEq
 - [x] add omitEntries
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
 - [ ] untyped entries?
 - [ ] optional entries?
 - [ ] solve the problem whereby some methods are incorrectly typed if we've
 added loosely-typed entries (this seems to be a problem with omit/pick?)
 */

export const virtualEntries: VirtualEntries = {
  $contentID: "cryptographic",
  //$signature: "string",
  $signerPublicKey: "eddsa_pubkey",
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
  V extends PODValueType,
> = Concrete<E & { [P in K]: V }>;

export class PODSpecBuilder<
  E extends EntryTypes,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  S extends StatementMap = {},
> {
  readonly #spec: PODSpec<E, S>;

  private constructor(spec: PODSpec<E, S>) {
    this.#spec = spec;
  }

  public static create() {
    return new PODSpecBuilder({
      entries: {},
      statements: {},
    });
  }

  public spec(): PODSpec<E, S> {
    return deepFreeze(this.#spec);
  }

  public toJSON(): string {
    return JSON.stringify(
      {
        ...this.#spec,
      },
      null,
      2
    );
  }

  public entry<
    K extends string,
    V extends PODValueType,
    NewEntries extends AddEntry<E, K, V>,
  >(
    key: IsSingleLiteralString<K> extends true ? Exclude<K, keyof E> : never,
    type: V
  ): PODSpecBuilder<NewEntries, S> {
    if (Object.prototype.hasOwnProperty.call(this.#spec.entries, key)) {
      throw new Error(`Entry "${key}" already exists`);
    }

    // Will throw if not a valid POD entry name
    checkPODName(key);

    return new PODSpecBuilder<NewEntries, S>({
      ...this.#spec,
      entries: {
        ...this.#spec.entries,
        [key]: type,
      } as NewEntries,
      statements: this.#spec.statements,
    });
  }

  /**
   * Pick entries by key
   */
  public pickEntries<
    K extends (keyof E extends never ? string : keyof E) & string,
  >(
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
          return (statement.entries as EntryKeys<E>).every((entry) =>
            keys.includes(entry as K)
          );
        })
      ) as Concrete<NonOverlappingStatements<S, K[]>>,
    });
  }

  public omitEntries<
    K extends (keyof E extends never ? string : keyof E) & string,
  >(
    keys: K[]
  ): PODSpecBuilder<Omit<E, K>, Concrete<NonOverlappingStatements<S, K[]>>> {
    return new PODSpecBuilder({
      ...this.#spec,
      entries: Object.fromEntries(
        Object.entries(this.#spec.entries).filter(
          ([key]) => !keys.includes(key as K)
        )
      ) as Omit<E, K>,
      statements: Object.fromEntries(
        Object.entries(this.#spec.statements).filter(([_key, statement]) => {
          return (statement.entries as EntryKeys<E>).every(
            (entry) => !keys.includes(entry as K)
          );
        })
      ) as Concrete<NonOverlappingStatements<S, K[]>>,
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
      ) as Concrete<Pick<S, K>>,
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
      ) as Concrete<Omit<S, K>>,
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
      : PODValueTupleForNamedEntries<E & VirtualEntries, N>[],
    customStatementName?: string
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
      ...virtualEntries,
    };

    for (const name of names) {
      if (!Object.prototype.hasOwnProperty.call(allEntries, name)) {
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
      isMemberOf: convertValuesToStringTuples<N>(names, values, allEntries),
    };

    const baseName = customStatementName ?? `${names.join("_")}_isMemberOf`;
    let statementName = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
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
      : PODValueTupleForNamedEntries<E & VirtualEntries, N>[],
    customStatementName?: string
  ): PODSpecBuilder<
    E,
    S & { [K in StatementName<N, "isNotMemberOf", S>]: IsNotMemberOf<E, N> }
  > {
    // Check that all names exist in entries
    for (const name of names) {
      if (!Object.prototype.hasOwnProperty.call(this.#spec.entries, name)) {
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
      ...virtualEntries,
    };

    for (const name of names) {
      if (!Object.prototype.hasOwnProperty.call(allEntries, name)) {
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
      isNotMemberOf: convertValuesToStringTuples<N>(names, values, allEntries),
    };

    const baseName = customStatementName ?? `${names.join("_")}_isNotMemberOf`;
    let statementName = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
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
    N extends keyof EntriesWithRangeChecks<E & VirtualEntries> & string,
  >(
    name: N,
    range: {
      min: E[N] extends "date" ? Date : bigint;
      max: E[N] extends "date" ? Date : bigint;
    },
    customStatementName?: string
  ): PODSpecBuilder<
    E,
    S & {
      [K in StatementName<[N & string], "inRange", S>]: InRange<
        E & VirtualEntries,
        N
      >;
    }
  > {
    // Check that the entry exists
    if (
      !Object.prototype.hasOwnProperty.call(this.#spec.entries, name) &&
      !Object.prototype.hasOwnProperty.call(virtualEntries, name)
    ) {
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

    const statement: InRange<E & VirtualEntries, N> = {
      entries: [name],
      type: "inRange",
      inRange: {
        min:
          range.min instanceof Date
            ? range.min.getTime().toString()
            : range.min.toString(),
        max:
          range.max instanceof Date
            ? range.max.getTime().toString()
            : range.max.toString(),
      },
    };

    const baseName = customStatementName ?? `${name}_inRange`;
    let statementName = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
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
    N extends keyof EntriesWithRangeChecks<E & VirtualEntries> & string,
  >(
    name: N,
    range: {
      min: E[N] extends "date" ? Date : bigint;
      max: E[N] extends "date" ? Date : bigint;
    },
    customStatementName?: string
  ): PODSpecBuilder<
    E,
    S & {
      [K in StatementName<[N & string], "notInRange", S>]: NotInRange<
        E & VirtualEntries,
        N
      >;
    }
  > {
    // Check that the entry exists
    if (
      !Object.prototype.hasOwnProperty.call(this.#spec.entries, name) &&
      !Object.prototype.hasOwnProperty.call(virtualEntries, name)
    ) {
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

    const statement: NotInRange<E & VirtualEntries, N> = {
      entries: [name],
      type: "notInRange",
      notInRange: {
        min:
          range.min instanceof Date
            ? range.min.getTime().toString()
            : range.min.toString(),
        max:
          range.max instanceof Date
            ? range.max.getTime().toString()
            : range.max.toString(),
      },
    };

    const baseName = customStatementName ?? `${name}_notInRange`;
    let statementName = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public equalsEntry<
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string,
  >(
    name1: N1,
    name2: Exclude<N2, N1>,
    customStatementName?: string
  ): PODSpecBuilder<
    E,
    S & {
      [K in StatementName<[N1, N2], "equalsEntry", S>]: EqualsEntry<E, N1, N2>;
    }
  > {
    // Check that both names exist in entries
    if (
      !Object.prototype.hasOwnProperty.call(this.#spec.entries, name1) &&
      !Object.prototype.hasOwnProperty.call(virtualEntries, name1)
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      !Object.prototype.hasOwnProperty.call(this.#spec.entries, name2) &&
      !Object.prototype.hasOwnProperty.call(virtualEntries, name2)
    ) {
      throw new Error(`Entry "${name2}" does not exist`);
    }
    if ((name1 as string) === (name2 as string)) {
      throw new Error("Entry names must be different");
    }
    if ((this.#spec.entries[name1] as string) !== this.#spec.entries[name2]) {
      throw new Error("Entry types must be the same");
    }

    const statement = {
      entries: [name1, name2],
      type: "equalsEntry",
    } satisfies EqualsEntry<E, N1, N2>;

    const baseName = customStatementName ?? `${name1}_${name2}_equalsEntry`;
    let statementName = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public notEqualsEntry<
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string,
  >(
    name1: N1,
    name2: Exclude<N2, N1>,
    customStatementName?: string
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
    if (
      !Object.prototype.hasOwnProperty.call(this.#spec.entries, name1) &&
      !Object.prototype.hasOwnProperty.call(virtualEntries, name1)
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      !Object.prototype.hasOwnProperty.call(this.#spec.entries, name2) &&
      !Object.prototype.hasOwnProperty.call(virtualEntries, name2)
    ) {
      throw new Error(`Entry "${name2}" does not exist`);
    }
    if ((name1 as string) === (name2 as string)) {
      throw new Error("Entry names must be different");
    }
    if ((this.#spec.entries[name1] as string) !== this.#spec.entries[name2]) {
      throw new Error("Entry types must be the same");
    }

    const statement = {
      entries: [name1, name2],
      type: "notEqualsEntry",
    } satisfies NotEqualsEntry<E, N1, N2>;

    const baseName = customStatementName ?? `${name1}_${name2}_notEqualsEntry`;
    let statementName = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public greaterThan<
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string,
  >(
    name1: N1,
    name2: Exclude<N2, N1>,
    customStatementName?: string
  ): PODSpecBuilder<
    E,
    S & {
      [K in StatementName<[N1, N2], "greaterThan", S>]: GreaterThan<E, N1, N2>;
    }
  > {
    // Check that both names exist in entries
    if (
      !Object.prototype.hasOwnProperty.call(this.#spec.entries, name1) &&
      !Object.prototype.hasOwnProperty.call(virtualEntries, name1)
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      !Object.prototype.hasOwnProperty.call(this.#spec.entries, name2) &&
      !Object.prototype.hasOwnProperty.call(virtualEntries, name2)
    ) {
      throw new Error(`Entry "${name2}" does not exist`);
    }
    if ((name1 as string) === (name2 as string)) {
      throw new Error("Entry names must be different");
    }
    if ((this.#spec.entries[name1] as string) !== this.#spec.entries[name2]) {
      throw new Error("Entry types must be the same");
    }

    const statement = {
      entries: [name1, name2],
      type: "greaterThan",
    } satisfies GreaterThan<E, N1, N2>;

    const baseName = customStatementName ?? `${name1}_${name2}_greaterThan`;
    let statementName = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public greaterThanEq<
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string,
  >(
    name1: N1,
    name2: Exclude<N2, N1>,
    customStatementName?: string
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
    if (
      !Object.prototype.hasOwnProperty.call(this.#spec.entries, name1) &&
      !Object.prototype.hasOwnProperty.call(virtualEntries, name1)
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      !Object.prototype.hasOwnProperty.call(this.#spec.entries, name2) &&
      !Object.prototype.hasOwnProperty.call(virtualEntries, name2)
    ) {
      throw new Error(`Entry "${name2}" does not exist`);
    }
    if ((name1 as string) === (name2 as string)) {
      throw new Error("Entry names must be different");
    }
    if ((this.#spec.entries[name1] as string) !== this.#spec.entries[name2]) {
      throw new Error("Entry types must be the same");
    }

    const statement = {
      entries: [name1, name2],
      type: "greaterThanEq",
    } satisfies GreaterThanEq<E, N1, N2>;

    const baseName = customStatementName ?? `${name1}_${name2}_greaterThanEq`;
    let statementName = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public lessThan<
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string,
  >(
    name1: N1,
    name2: Exclude<N2, N1>,
    customStatementName?: string
  ): PODSpecBuilder<
    E,
    S & {
      [K in StatementName<[N1, N2], "lessThan", S>]: LessThan<E, N1, N2>;
    }
  > {
    // Check that both names exist in entries
    if (
      !Object.prototype.hasOwnProperty.call(this.#spec.entries, name1) &&
      !Object.prototype.hasOwnProperty.call(virtualEntries, name1)
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      !Object.prototype.hasOwnProperty.call(this.#spec.entries, name2) &&
      !Object.prototype.hasOwnProperty.call(virtualEntries, name2)
    ) {
      throw new Error(`Entry "${name2}" does not exist`);
    }
    if ((name1 as string) === (name2 as string)) {
      throw new Error("Entry names must be different");
    }
    if ((this.#spec.entries[name1] as string) !== this.#spec.entries[name2]) {
      throw new Error("Entry types must be the same");
    }

    const statement = {
      entries: [name1, name2],
      type: "lessThan",
    } satisfies LessThan<E, N1, N2>;

    const baseName = customStatementName ?? `${name1}_${name2}_lessThan`;
    let statementName = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public lessThanEq<
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string,
  >(
    name1: N1,
    name2: Exclude<N2, N1>,
    customStatementName?: string
  ): PODSpecBuilder<
    E,
    S & {
      [K in StatementName<[N1, N2], "lessThanEq", S>]: LessThanEq<E, N1, N2>;
    }
  > {
    // Check that both names exist in entries
    if (
      !Object.prototype.hasOwnProperty.call(this.#spec.entries, name1) &&
      !Object.prototype.hasOwnProperty.call(virtualEntries, name1)
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      !Object.prototype.hasOwnProperty.call(this.#spec.entries, name2) &&
      !Object.prototype.hasOwnProperty.call(virtualEntries, name2)
    ) {
      throw new Error(`Entry "${name2}" does not exist`);
    }
    if ((name1 as string) === (name2 as string)) {
      throw new Error("Entry names must be different");
    }
    if ((this.#spec.entries[name1] as string) !== this.#spec.entries[name2]) {
      throw new Error("Entry types must be the same");
    }

    const statement = {
      entries: [name1, name2],
      type: "lessThanEq",
    } satisfies LessThanEq<E, N1, N2>;

    const baseName = customStatementName ?? `${name1}_${name2}_lessThanEq`;
    let statementName = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("PODSpecBuilder", () => {
    it("should be able to create a builder", () => {
      const builder = PODSpecBuilder.create();
      expect(builder).toBeDefined();

      const builderWithEntries = builder
        .entry("my_string", "string")
        .entry("my_int", "int")
        .entry("my_cryptographic", "cryptographic")
        .entry("my_bytes", "bytes")
        .entry("my_date", "date")
        .entry("my_null", "null")
        .entry("my_eddsa_pubkey", "eddsa_pubkey")
        .entry("my_other_string", "string")
        .entry("my_other_int", "int");

      expect(builderWithEntries.spec().entries).toEqual({
        my_string: "string",
        my_int: "int",
        my_cryptographic: "cryptographic",
        my_bytes: "bytes",
        my_date: "date",
        my_null: "null",
        my_eddsa_pubkey: "eddsa_pubkey",
        my_other_string: "string",
        my_other_int: "int",
      });

      const builderWithStatements = builderWithEntries
        .inRange("my_int", { min: 0n, max: 10n })
        .inRange("my_date", {
          min: new Date("2020-01-01"),
          max: new Date("2020-01-10"),
        })
        .isMemberOf(["my_string"], ["foo", "bar"])
        .isNotMemberOf(["my_string"], ["baz"])
        .equalsEntry("my_string", "my_other_string")
        .notEqualsEntry("my_int", "my_other_int")
        // TODO At some point, some of these should throw because they cannot
        // possibly all be true.
        .greaterThan("my_int", "my_other_int")
        .greaterThanEq("my_int", "my_other_int")
        .lessThan("my_int", "my_other_int")
        .lessThanEq("my_int", "my_other_int");

      expect(Object.keys(builderWithStatements.spec().statements)).toEqual([
        "my_int_inRange",
        "my_date_inRange",
        "my_string_isMemberOf",
        "my_string_isNotMemberOf",
        "my_string_my_other_string_equalsEntry",
        "my_int_my_other_int_notEqualsEntry",
        "my_int_my_other_int_greaterThan",
        "my_int_my_other_int_greaterThanEq",
        "my_int_my_other_int_lessThan",
        "my_int_my_other_int_lessThanEq",
      ]);

      builderWithEntries
        // @ts-expect-error entry does not exist
        .isMemberOf(["non_existent_entry"], ["foo", "bar"]);
    });
  });
}
