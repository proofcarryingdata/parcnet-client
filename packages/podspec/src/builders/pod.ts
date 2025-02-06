import type { IsJsonSafe } from "../shared/jsonSafe.js";
import type { IsSingleLiteralString } from "../shared/types.js";
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
import { UntypedPODSpecBuilder } from "./untypedPod.js";

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
 - [ ] handle multiple/incompatible range/inequality checks on the same entry
 - [x] switch to using value types rather than PODValues (everywhere? maybe not membership lists)
 - [ ] better error messages
 - [ ] consider adding a hash to the spec to prevent tampering
 - [ ] optional/nullable entries
 - [ ] restrict gt/lt/etc checks to numeric types?
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
  readonly #innerBuilder: UntypedPODSpecBuilder;

  private constructor(innerBuilder: UntypedPODSpecBuilder) {
    this.#innerBuilder = innerBuilder;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  public static create(): PODSpecBuilder<{}, {}> {
    return new PODSpecBuilder(UntypedPODSpecBuilder.create());
  }

  public spec(): PODSpec<E, S> {
    return this.#innerBuilder.spec() as PODSpec<E, S>;
  }

  public toJSON(): string {
    return this.#innerBuilder.toJSON();
  }

  public entry<
    K extends string,
    V extends PODValueType,
    NewEntries extends AddEntry<E, K, V>,
  >(
    key: IsSingleLiteralString<K> extends true ? Exclude<K, keyof E> : never,
    type: V
  ): PODSpecBuilder<NewEntries, S> {
    return new PODSpecBuilder<NewEntries, S>(
      this.#innerBuilder.entry(key, type)
    );
  }

  public entries<NewEntries extends EntryTypes>(
    entries: NewEntries
  ): PODSpecBuilder<Concrete<E & NewEntries>, S> {
    return new PODSpecBuilder(this.#innerBuilder.entries(entries));
  }

  /**
   * Pick entries by key
   */
  public pickEntries<
    K extends (keyof E extends never ? string : keyof E) & string,
  >(
    keys: K[]
  ): PODSpecBuilder<Pick<E, K>, Concrete<NonOverlappingStatements<S, K[]>>> {
    return new PODSpecBuilder(this.#innerBuilder.pickEntries(keys));
  }

  public omitEntries<
    K extends (keyof E extends never ? string : keyof E) & string,
  >(
    keys: K[]
  ): PODSpecBuilder<Omit<E, K>, Concrete<NonOverlappingStatements<S, K[]>>> {
    return new PODSpecBuilder(this.#innerBuilder.omitEntries(keys));
  }

  public pickStatements<K extends keyof S & string>(
    keys: K[]
  ): PODSpecBuilder<E, Concrete<Pick<S, K>>> {
    return new PODSpecBuilder(this.#innerBuilder.pickStatements(keys));
  }

  public omitStatements<K extends keyof S & string>(
    keys: K[]
  ): PODSpecBuilder<E, Concrete<Omit<S, K>>> {
    return new PODSpecBuilder(this.#innerBuilder.omitStatements(keys));
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
  public isMemberOf<N extends EntryKeys<E & VirtualEntries>, C extends string>(
    names: [...N],
    values: N["length"] extends 1
      ? PODValueTypeFromTypeName<
          (E & VirtualEntries)[N[0] & keyof (E & VirtualEntries)]
        >[]
      : PODValueTupleForNamedEntries<E & VirtualEntries, N>[],
    customStatementName?: C
  ): PODSpecBuilder<
    E,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<N, "isMemberOf", S>]: IsMemberOf<E & VirtualEntries, N>;
    }
  > {
    return new PODSpecBuilder(
      this.#innerBuilder.isMemberOf(names, values, customStatementName)
    );
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
  public isNotMemberOf<N extends EntryKeys<E>, C extends string>(
    names: [...N],
    values: N["length"] extends 1
      ? PODValueTypeFromTypeName<
          (E & VirtualEntries)[N[0] & keyof (E & VirtualEntries)]
        >[]
      : PODValueTupleForNamedEntries<E & VirtualEntries, N>[],
    customStatementName?: C
  ): PODSpecBuilder<
    E,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<N, "isNotMemberOf", S>]: IsNotMemberOf<E, N>;
    }
  > {
    return new PODSpecBuilder(
      this.#innerBuilder.isNotMemberOf(names, values, customStatementName)
    );
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
    C extends string,
  >(
    name: N,
    range: {
      min: E[N] extends "date" ? Date : bigint;
      max: E[N] extends "date" ? Date : bigint;
    },
    customStatementName?: C
  ): PODSpecBuilder<
    E,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<[N & string], "inRange", S>]: InRange<
        E & VirtualEntries,
        N
      >;
    }
  > {
    return new PODSpecBuilder(
      this.#innerBuilder.inRange(name, range, customStatementName)
    );
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
    C extends string,
  >(
    name: N,
    range: {
      min: E[N] extends "date" ? Date : bigint;
      max: E[N] extends "date" ? Date : bigint;
    },
    customStatementName?: C
  ): PODSpecBuilder<
    E,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<[N & string], "notInRange", S>]: NotInRange<
        E & VirtualEntries,
        N
      >;
    }
  > {
    return new PODSpecBuilder(
      this.#innerBuilder.notInRange(name, range, customStatementName)
    );
  }

  public equalsEntry<
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string,
    C extends string,
  >(
    name1: N1,
    name2: Exclude<N2, N1>,
    customStatementName?: C
  ): PODSpecBuilder<
    E,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<[N1, N2], "equalsEntry", S>]: EqualsEntry<E, N1, N2>;
    }
  > {
    return new PODSpecBuilder(
      this.#innerBuilder.equalsEntry(name1, name2, customStatementName)
    );
  }

  public notEqualsEntry<
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string,
    C extends string,
  >(
    name1: N1,
    name2: Exclude<N2, N1>,
    customStatementName?: C
  ): PODSpecBuilder<
    E,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<[N1, N2], "notEqualsEntry", S>]: NotEqualsEntry<
        E,
        N1,
        N2
      >;
    }
  > {
    return new PODSpecBuilder(
      this.#innerBuilder.notEqualsEntry(name1, name2, customStatementName)
    );
  }

  public greaterThan<
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string,
    C extends string,
  >(
    name1: N1,
    name2: Exclude<N2, N1>,
    customStatementName?: C
  ): PODSpecBuilder<
    E,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<[N1, N2], "greaterThan", S>]: GreaterThan<E, N1, N2>;
    }
  > {
    return new PODSpecBuilder(
      this.#innerBuilder.greaterThan(name1, name2, customStatementName)
    );
  }

  public greaterThanEq<
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string,
    C extends string,
  >(
    name1: N1,
    name2: Exclude<N2, N1>,
    customStatementName?: C
  ): PODSpecBuilder<
    E,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<[N1, N2], "greaterThanEq", S>]: GreaterThanEq<
        E,
        N1,
        N2
      >;
    }
  > {
    return new PODSpecBuilder(
      this.#innerBuilder.greaterThanEq(name1, name2, customStatementName)
    );
  }

  public lessThan<
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string,
    C extends string,
  >(
    name1: N1,
    name2: Exclude<N2, N1>,
    customStatementName?: C
  ): PODSpecBuilder<
    E,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<[N1, N2], "lessThan", S>]: LessThan<E, N1, N2>;
    }
  > {
    return new PODSpecBuilder(
      this.#innerBuilder.lessThan(name1, name2, customStatementName)
    );
  }

  public lessThanEq<
    N1 extends keyof (E & VirtualEntries) & string,
    N2 extends keyof EntriesOfType<
      E & VirtualEntries,
      (E & VirtualEntries)[N1]
    > &
      string,
    C extends string,
  >(
    name1: N1,
    name2: Exclude<N2, N1>,
    customStatementName?: C
  ): PODSpecBuilder<
    E,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<[N1, N2], "lessThanEq", S>]: LessThanEq<E, N1, N2>;
    }
  > {
    return new PODSpecBuilder(
      this.#innerBuilder.lessThanEq(name1, name2, customStatementName)
    );
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

      expect(() =>
        builderWithEntries
          // @ts-expect-error entry does not exist
          .isMemberOf(["non_existent_entry"], ["foo", "bar"])
      ).toThrow();
    });
  });
}
