import type { PODName } from "@pcd/pod";
import type { IsSingleLiteralString } from "../shared/types.js";
import { type PODSpec, PODSpecBuilder } from "./pod.js";
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
  SupportsRangeChecks,
} from "./types/statements.js";
import { UntypedPODGroupSpecBuilder } from "./untypedGroup.js";

export type NamedPODSpecs = Record<PODName, PODSpec<EntryTypes, StatementMap>>;

/**
 @todo
 - [ ] Maybe collapse the POD entries structure into a single object, rather
 than nested PODs? Might improve reuse with PODSpecBuilder and make typing
 easier.
 */

export type PODGroupSpec<P extends NamedPODSpecs, S extends StatementMap> = {
  pods: P;
  statements: S;
};

export type AllPODEntries<P extends NamedPODSpecs> = Evaluate<
  UnionToIntersection<
    {
      [K in keyof P]: {
        [E in keyof (P[K]["entries"] & VirtualEntries) as `${K & string}.${E &
          string}`]: (P[K]["entries"] & VirtualEntries)[E];
      };
    }[keyof P] extends infer O
      ? { [K in keyof O]: O[K] }
      : never
  >
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (
  x: infer I
) => void
  ? I
  : never;

type MustBePODValueType<T> = T extends PODValueType ? T : never;

type EntryType<
  P extends NamedPODSpecs,
  K extends keyof AllPODEntries<P>,
> = MustBePODValueType<AllPODEntries<P>[K]>;

type Evaluate<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

type AddPOD<
  PODs extends NamedPODSpecs,
  N extends PODName,
  Spec extends PODSpec<EntryTypes, StatementMap>,
> = Evaluate<{
  [K in keyof PODs | N]: K extends N ? Spec : PODs[K & keyof PODs];
}>;

// TODO it's possible to create a PODGroupSpecBuilder with no PODs initially,
// and this causes some issues for typing, because we can't assume that there
// will be any PODs. The create/constructor should require at least one named
// POD, which will ensure there is always one POD. Any attempt to remove the
// final POD should fail.
// Once fixed, we can add some extra type exclusions around statements which
// refer to multiple POD entries, where the second entry cannot be the same as
// the first.
export class PODGroupSpecBuilder<
  P extends NamedPODSpecs,
  S extends StatementMap,
> {
  readonly #innerBuilder: UntypedPODGroupSpecBuilder;

  private constructor(innerBuilder: UntypedPODGroupSpecBuilder) {
    this.#innerBuilder = innerBuilder;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  public static create(): PODGroupSpecBuilder<{}, {}> {
    return new PODGroupSpecBuilder(UntypedPODGroupSpecBuilder.create());
  }

  public spec(): PODGroupSpec<P, S> {
    return this.#innerBuilder.spec() as PODGroupSpec<P, S>;
  }

  public pod<
    N extends PODName,
    Spec extends PODSpec<EntryTypes, StatementMap>,
    NewPods extends AddPOD<P, N, Spec>,
  >(
    name: IsSingleLiteralString<N> extends true ? N : never,
    spec: Spec
  ): PODGroupSpecBuilder<NewPods, S> {
    return new PODGroupSpecBuilder(this.#innerBuilder.pod(name, spec));
  }

  public isMemberOf<N extends EntryKeys<AllPODEntries<P>>, C extends string>(
    names: [...N],
    values: N["length"] extends 1
      ? PODValueTypeFromTypeName<EntryType<P, N[0] & keyof AllPODEntries<P>>>[]
      : PODValueTupleForNamedEntries<AllPODEntries<P>, N>[],
    customStatementName?: C
  ): PODGroupSpecBuilder<
    P,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<N, "isMemberOf", S>]: IsMemberOf<AllPODEntries<P>, N>;
    }
  > {
    return new PODGroupSpecBuilder(
      this.#innerBuilder.isMemberOf(names, values, customStatementName)
    );
  }

  public isNotMemberOf<N extends EntryKeys<AllPODEntries<P>>, C extends string>(
    names: [...N],
    values: N["length"] extends 1
      ? PODValueTypeFromTypeName<EntryType<P, N[0] & keyof AllPODEntries<P>>>[]
      : PODValueTupleForNamedEntries<AllPODEntries<P>, N>[],
    customStatementName?: C
  ): PODGroupSpecBuilder<
    P,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<N, "isNotMemberOf", S>]: IsNotMemberOf<
        AllPODEntries<P>,
        N
      >;
    }
  > {
    return new PODGroupSpecBuilder(
      this.#innerBuilder.isNotMemberOf(names, values, customStatementName)
    );
  }

  public inRange<
    N extends keyof EntriesOfType<AllPODEntries<P>, SupportsRangeChecks> &
      string,
    C extends string,
  >(
    name: N,
    range: {
      min: N extends keyof EntriesWithRangeChecks<AllPODEntries<P>>
        ? AllPODEntries<P>[N] extends "date"
          ? Date
          : bigint
        : Date | bigint;
      max: N extends keyof EntriesWithRangeChecks<AllPODEntries<P>>
        ? AllPODEntries<P>[N] extends "date"
          ? Date
          : bigint
        : Date | bigint;
    },
    customStatementName?: C
  ): PODGroupSpecBuilder<
    P,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<[N & string], "inRange", S>]: InRange<
        AllPODEntries<P>,
        N
      >;
    }
  > {
    return new PODGroupSpecBuilder(
      this.#innerBuilder.inRange(name, range, customStatementName)
    );
  }

  public notInRange<
    N extends keyof EntriesOfType<AllPODEntries<P>, SupportsRangeChecks> &
      string,
    C extends string,
  >(
    name: N,
    range: {
      min: AllPODEntries<P>[N] extends "date" ? Date : bigint;
      max: AllPODEntries<P>[N] extends "date" ? Date : bigint;
    },
    customStatementName?: C
  ): PODGroupSpecBuilder<
    P,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<[N & string], "notInRange", S>]: NotInRange<
        AllPODEntries<P>,
        N
      >;
    }
  > {
    return new PODGroupSpecBuilder(
      this.#innerBuilder.notInRange(name, range, customStatementName)
    );
  }

  public greaterThan<
    N1 extends keyof AllPODEntries<P> & string,
    N2 extends keyof EntriesOfType<AllPODEntries<P>, EntryType<P, N1>> & string,
    C extends string,
  >(
    name1: N1,
    name2: N2,
    customStatementName?: C
  ): PODGroupSpecBuilder<
    P,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<
            [N1 & string, N2 & string],
            "greaterThan",
            S
          >]: GreaterThan<AllPODEntries<P>, N1, N2>;
    }
  > {
    return new PODGroupSpecBuilder(
      this.#innerBuilder.greaterThan(name1, name2, customStatementName)
    );
  }

  public greaterThanEq<
    N1 extends keyof AllPODEntries<P> & string,
    N2 extends keyof EntriesOfType<AllPODEntries<P>, EntryType<P, N1>> & string,
    C extends string,
  >(
    name1: N1,
    name2: N2,
    customStatementName?: C
  ): PODGroupSpecBuilder<
    P,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<
            [N1 & string, N2 & string],
            "greaterThanEq",
            S
          >]: GreaterThanEq<AllPODEntries<P>, N1, N2>;
    }
  > {
    return new PODGroupSpecBuilder(
      this.#innerBuilder.greaterThanEq(name1, name2, customStatementName)
    );
  }

  public lessThan<
    N1 extends keyof AllPODEntries<P> & string,
    N2 extends keyof EntriesOfType<AllPODEntries<P>, EntryType<P, N1>> & string,
    C extends string,
  >(
    name1: N1,
    name2: N2,
    customStatementName?: C
  ): PODGroupSpecBuilder<
    P,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<[N1 & string, N2 & string], "lessThan", S>]: LessThan<
        AllPODEntries<P>,
        N1,
        N2
      >;
    }
  > {
    return new PODGroupSpecBuilder(
      this.#innerBuilder.lessThan(name1, name2, customStatementName)
    );
  }

  public lessThanEq<
    N1 extends keyof AllPODEntries<P> & string,
    N2 extends keyof EntriesOfType<AllPODEntries<P>, EntryType<P, N1>> & string,
    C extends string,
  >(
    name1: N1,
    name2: N2,
    customStatementName?: C
  ): PODGroupSpecBuilder<
    P,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<
            [N1 & string, N2 & string],
            "lessThanEq",
            S
          >]: LessThanEq<AllPODEntries<P>, N1, N2>;
    }
  > {
    return new PODGroupSpecBuilder(
      this.#innerBuilder.lessThanEq(name1, name2, customStatementName)
    );
  }

  public equalsEntry<
    N1 extends keyof AllPODEntries<P> & string,
    N2 extends keyof EntriesOfType<AllPODEntries<P>, EntryType<P, N1>> & string,
    C extends string,
  >(
    name1: N1,
    name2: N2,
    customStatementName?: C
  ): PODGroupSpecBuilder<
    P,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<
            [N1 & string, N2 & string],
            "equalsEntry",
            S
          >]: EqualsEntry<AllPODEntries<P>, N1, N2>;
    }
  > {
    return new PODGroupSpecBuilder(
      this.#innerBuilder.equalsEntry(name1, name2, customStatementName)
    );
  }

  public notEqualsEntry<
    N1 extends keyof AllPODEntries<P> & string,
    N2 extends keyof EntriesOfType<AllPODEntries<P>, EntryType<P, N1>> & string,
    C extends string,
  >(
    name1: N1,
    name2: N2,
    customStatementName?: C
  ): PODGroupSpecBuilder<
    P,
    S & {
      [K in IsSingleLiteralString<C> extends true
        ? C
        : StatementName<
            [N1 & string, N2 & string],
            "notEqualsEntry",
            S
          >]: NotEqualsEntry<AllPODEntries<P>, N1, N2>;
    }
  > {
    return new PODGroupSpecBuilder(
      this.#innerBuilder.notEqualsEntry(name1, name2, customStatementName)
    );
  }
}

if (import.meta.vitest) {
  const { describe, it } = import.meta.vitest;

  describe("PODGroupSpecBuilder", () => {
    it("should be able to create a builder", () => {
      const pod = PODSpecBuilder.create()
        .entry("my_string", "string")
        .entry("my_int", "int")
        .entry("mystery_name", "string");

      const _pod2 = PODSpecBuilder.create().entry("something_else", "boolean");

      const _builder = PODGroupSpecBuilder.create()
        .pod("foo", pod.spec())
        .pod("bar", pod.spec())
        .inRange("foo.my_int", { min: 0n, max: 10n });
    });
  });
}

type _Entries = AllPODEntries<{
  foo: {
    entries: {
      my_string: "string";
      my_int: "int";
      mystery_name: "string";
    };
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    statements: {};
  };
  bar: {
    entries: {
      something_else: "boolean";
    };
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    statements: {};
  };
}>;

if (import.meta.vitest) {
  const { describe, it } = import.meta.vitest;

  describe("PODGroupSpecBuilder", () => {
    it("should be able to create a builder", () => {
      const pod = PODSpecBuilder.create()
        .entry("my_string", "string")
        .entry("my_int", "int")
        .entry("mystery_name", "string");

      const _builder = PODGroupSpecBuilder.create().pod("foo", pod.spec());
    });
  });
}
