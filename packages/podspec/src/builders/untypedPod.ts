/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  type PODValue,
  POD_DATE_MAX,
  POD_DATE_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  checkPODName,
} from "@pcd/pod";
import type { IsJsonSafe } from "../shared/jsonSafe.js";
import { virtualEntries } from "./pod.js";
import {
  convertValuesToStringTuples,
  deepFreeze,
  supportsRangeChecks,
  validateRange,
} from "./shared.js";
import type { EntryKeys, EntryTypes, PODValueType } from "./types/entries.js";
import type {
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
} from "./types/statements.js";

export type PODSpec<E extends EntryTypes, S extends StatementMap> = {
  entries: E;
  statements: S;
};

// This is a compile-time check that the PODSpec is JSON-safe
true satisfies IsJsonSafe<PODSpec<EntryTypes, StatementMap>>;

export class UntypedPODSpecBuilder {
  readonly #spec: PODSpec<EntryTypes, StatementMap>;

  public constructor(spec: PODSpec<EntryTypes, StatementMap>) {
    this.#spec = spec;
  }

  public static create() {
    return new UntypedPODSpecBuilder({
      entries: {},
      statements: {},
    });
  }

  public spec(): PODSpec<EntryTypes, StatementMap> {
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

  public entry(key: string, type: PODValueType): UntypedPODSpecBuilder {
    if (Object.prototype.hasOwnProperty.call(this.#spec.entries, key)) {
      throw new Error(`Entry "${key}" already exists`);
    }

    // Will throw if not a valid POD entry name
    checkPODName(key);

    return new UntypedPODSpecBuilder({
      ...this.#spec,
      entries: {
        ...this.#spec.entries,
        [key]: type,
      },
      statements: this.#spec.statements,
    });
  }

  public entries<NewEntries extends EntryTypes>(
    entries: NewEntries
  ): UntypedPODSpecBuilder {
    for (const entryName of Object.keys(entries)) {
      if (Object.prototype.hasOwnProperty.call(this.#spec.entries, entryName)) {
        throw new Error(`Entry "${entryName}" already exists`);
      }

      // Will throw if not a valid POD entry name
      checkPODName(entryName);
    }

    return new UntypedPODSpecBuilder({
      ...this.#spec,
      entries: { ...this.#spec.entries, ...entries },
      statements: this.#spec.statements,
    });
  }

  /**
   * Pick entries by key
   */
  public pickEntries(keys: string[]): UntypedPODSpecBuilder {
    return new UntypedPODSpecBuilder({
      entries: Object.fromEntries(
        Object.entries(this.#spec.entries).filter(([key]) => keys.includes(key))
      ) as Pick<EntryTypes, string>,
      statements: Object.fromEntries(
        Object.entries(this.#spec.statements).filter(([_key, statement]) => {
          return (statement.entries as EntryKeys<EntryTypes>).every((entry) =>
            keys.includes(entry)
          );
        })
      ) as StatementMap,
    });
  }

  public omitEntries(keys: string[]): UntypedPODSpecBuilder {
    return new UntypedPODSpecBuilder({
      ...this.#spec,
      entries: Object.fromEntries(
        Object.entries(this.#spec.entries).filter(
          ([key]) => !keys.includes(key)
        )
      ),
      statements: Object.fromEntries(
        Object.entries(this.#spec.statements).filter(([_key, statement]) => {
          return (statement.entries as EntryKeys<EntryTypes>).every(
            (entry) => !keys.includes(entry)
          );
        })
      ) as StatementMap,
    });
  }

  public pickStatements(keys: string[]): UntypedPODSpecBuilder {
    return new UntypedPODSpecBuilder({
      ...this.#spec,
      statements: Object.fromEntries(
        Object.entries(this.#spec.statements).filter(([key]) =>
          keys.includes(key)
        )
      ) as StatementMap,
    });
  }

  public omitStatements(keys: string[]): UntypedPODSpecBuilder {
    return new UntypedPODSpecBuilder({
      ...this.#spec,
      statements: Object.fromEntries(
        Object.entries(this.#spec.statements).filter(
          ([key]) => !keys.includes(key)
        )
      ) as StatementMap,
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
  public isMemberOf(
    names: string[],
    values: PODValue["value"][] | PODValue["value"][][],
    customStatementName?: string
  ): UntypedPODSpecBuilder {
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
    const statement: IsMemberOf<any, any> = {
      entries: names,
      type: "isMemberOf",
      isMemberOf: convertValuesToStringTuples<any>(names, values, allEntries),
    };

    const baseName = customStatementName ?? `${names.join("_")}_isMemberOf`;
    let statementName: string = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new UntypedPODSpecBuilder({
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
  public isNotMemberOf(
    names: string[],
    values: PODValue["value"][] | PODValue["value"][][],
    customStatementName?: string
  ): UntypedPODSpecBuilder {
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
    const statement: IsNotMemberOf<any, any> = {
      entries: names,
      type: "isNotMemberOf",
      isNotMemberOf: convertValuesToStringTuples<any>(
        names,
        values,
        allEntries
      ),
    };

    const baseName = customStatementName ?? `${names.join("_")}_isNotMemberOf`;
    let statementName: string = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new UntypedPODSpecBuilder({
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
  public inRange(
    name: string,
    range: {
      min: bigint | Date;
      max: bigint | Date;
    },
    customStatementName?: string
  ): UntypedPODSpecBuilder {
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

    const statement: InRange<any, any> = {
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
    let statementName: string = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new UntypedPODSpecBuilder({
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
  public notInRange(
    name: string,
    range: {
      min: bigint | Date;
      max: bigint | Date;
    },
    customStatementName?: string
  ): UntypedPODSpecBuilder {
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

    const statement: NotInRange<any, any> = {
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
    let statementName: string = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new UntypedPODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public equalsEntry(
    name1: string,
    name2: string,
    customStatementName?: string
  ): UntypedPODSpecBuilder {
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
    if (name1 === name2) {
      throw new Error("Entry names must be different");
    }
    if (this.#spec.entries[name1] !== this.#spec.entries[name2]) {
      throw new Error("Entry types must be the same");
    }

    const statement = {
      entries: [name1, name2],
      type: "equalsEntry",
    } satisfies EqualsEntry<any, any, any>;

    const baseName = customStatementName ?? `${name1}_${name2}_equalsEntry`;
    let statementName: string = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new UntypedPODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public notEqualsEntry(
    name1: string,
    name2: string,
    customStatementName?: string
  ): UntypedPODSpecBuilder {
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
    if (name1 === name2) {
      throw new Error("Entry names must be different");
    }
    if (this.#spec.entries[name1] !== this.#spec.entries[name2]) {
      throw new Error("Entry types must be the same");
    }

    const statement = {
      entries: [name1, name2],
      type: "notEqualsEntry",
    } satisfies NotEqualsEntry<any, any, any>;

    const baseName = customStatementName ?? `${name1}_${name2}_notEqualsEntry`;
    let statementName: string = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new UntypedPODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public greaterThan(
    name1: string,
    name2: string,
    customStatementName?: string
  ): UntypedPODSpecBuilder {
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
    if (name1 === name2) {
      throw new Error("Entry names must be different");
    }
    if (this.#spec.entries[name1] !== this.#spec.entries[name2]) {
      throw new Error("Entry types must be the same");
    }

    const statement = {
      entries: [name1, name2],
      type: "greaterThan",
    } satisfies GreaterThan<any, any, any>;

    const baseName = customStatementName ?? `${name1}_${name2}_greaterThan`;
    let statementName: string = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new UntypedPODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public greaterThanEq(
    name1: string,
    name2: string,
    customStatementName?: string
  ): UntypedPODSpecBuilder {
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
    if (name1 === name2) {
      throw new Error("Entry names must be different");
    }
    if (this.#spec.entries[name1] !== this.#spec.entries[name2]) {
      throw new Error("Entry types must be the same");
    }

    const statement = {
      entries: [name1, name2],
      type: "greaterThanEq",
    } satisfies GreaterThanEq<any, any, any>;

    const baseName = customStatementName ?? `${name1}_${name2}_greaterThanEq`;
    let statementName: string = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new UntypedPODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public lessThan(
    name1: string,
    name2: string,
    customStatementName?: string
  ): UntypedPODSpecBuilder {
    // Check that both names exist in entries
    if (
      !Object.prototype.hasOwnProperty.call(this.#spec.entries, name2) &&
      !Object.prototype.hasOwnProperty.call(virtualEntries, name2)
    ) {
      throw new Error(`Entry "${name2}" does not exist`);
    }
    if (name1 === name2) {
      throw new Error("Entry names must be different");
    }
    if (this.#spec.entries[name1] !== this.#spec.entries[name2]) {
      throw new Error("Entry types must be the same");
    }

    const statement = {
      entries: [name1, name2],
      type: "lessThan",
    } satisfies LessThan<any, any, any>;

    const baseName = customStatementName ?? `${name1}_${name2}_lessThan`;
    let statementName: string = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new UntypedPODSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public lessThanEq(
    name1: string,
    name2: string,
    customStatementName?: string
  ): UntypedPODSpecBuilder {
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
    if (name1 === name2) {
      throw new Error("Entry names must be different");
    }
    if (this.#spec.entries[name1] !== this.#spec.entries[name2]) {
      throw new Error("Entry types must be the same");
    }

    const statement = {
      entries: [name1, name2],
      type: "lessThanEq",
    } satisfies LessThanEq<any, any, any>;

    const baseName = customStatementName ?? `${name1}_${name2}_lessThanEq`;
    let statementName: string = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new UntypedPODSpecBuilder({
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
      const builder = UntypedPODSpecBuilder.create();
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

      builderWithEntries.isMemberOf(["non_existent_entry"], ["foo", "bar"]);
    });
  });
}
