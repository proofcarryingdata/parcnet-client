import {
  type PODName,
  POD_DATE_MAX,
  POD_DATE_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  checkPODName,
} from "@pcd/pod";
import type { IsSingleLiteralString } from "../shared/types.js";
import { type PODSpec, PODSpecBuilder, virtualEntries } from "./pod.js";
import {
  convertValuesToStringTuples,
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
  SupportsRangeChecks,
} from "./types/statements.js";

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
  readonly #spec: PODGroupSpec<P, S>;

  private constructor(spec: PODGroupSpec<P, S>) {
    this.#spec = spec;
  }

  public static create() {
    return new PODGroupSpecBuilder({
      pods: {},
      statements: {},
    });
  }

  public spec(): PODGroupSpec<P, S> {
    return structuredClone(this.#spec);
  }

  public pod<
    N extends PODName,
    Spec extends PODSpec<EntryTypes, StatementMap>,
    NewPods extends AddPOD<P, N, Spec>,
  >(
    name: IsSingleLiteralString<N> extends true ? N : never,
    spec: Spec
  ): PODGroupSpecBuilder<NewPods, S> {
    if (Object.prototype.hasOwnProperty.call(this.#spec.pods, name)) {
      throw new Error(`POD "${name}" already exists`);
    }

    // Will throw if the name is not valid.
    checkPODName(name);

    return new PODGroupSpecBuilder({
      ...this.#spec,
      pods: { ...this.#spec.pods, [name]: spec } as unknown as NewPods,
    });
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
    // Check for duplicate names
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      throw new Error("Duplicate entry names are not allowed");
    }

    const allEntries = Object.fromEntries(
      Object.entries(this.#spec.pods).flatMap(([podName, podSpec]) => [
        ...Object.entries(podSpec.entries).map(
          ([entryName, entryType]): [string, PODValueType] => [
            `${podName}.${entryName}`,
            entryType,
          ]
        ),
        ...Object.entries(virtualEntries).map(
          ([entryName, entryType]): [string, PODValueType] => [
            `${podName}.${entryName}`,
            entryType,
          ]
        ),
      ])
    );

    for (const name of names) {
      if (!Object.prototype.hasOwnProperty.call(allEntries, name)) {
        throw new Error(`Entry "${name}" does not exist`);
      }
    }

    const statement: IsMemberOf<AllPODEntries<P>, N> = {
      entries: names,
      type: "isMemberOf",
      isMemberOf: convertValuesToStringTuples<N>(
        names,
        values,
        allEntries as Record<N[number], PODValueType>
      ),
    };

    const baseName = customStatementName ?? `${names.join("_")}_isMemberOf`;
    let statementName: string = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
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
    // Check for duplicate names
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      throw new Error("Duplicate entry names are not allowed");
    }

    const allEntries = Object.fromEntries(
      Object.entries(this.#spec.pods).flatMap(([podName, podSpec]) => [
        ...Object.entries(podSpec.entries).map(
          ([entryName, entryType]): [string, PODValueType] => [
            `${podName}.${entryName}`,
            entryType,
          ]
        ),
        ...Object.entries(virtualEntries).map(
          ([entryName, entryType]): [string, PODValueType] => [
            `${podName}.${entryName}`,
            entryType,
          ]
        ),
      ])
    );

    for (const name of names) {
      if (!Object.prototype.hasOwnProperty.call(allEntries, name)) {
        throw new Error(`Entry "${name}" does not exist`);
      }
    }

    const statement: IsNotMemberOf<AllPODEntries<P>, N> = {
      entries: names,
      type: "isNotMemberOf",
      isNotMemberOf: convertValuesToStringTuples<N>(
        names,
        values,
        allEntries as Record<N[number], PODValueType>
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

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
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
    // Check that the entry exists
    const [podName, entryName] = name.split(".");
    if (
      podName === undefined ||
      entryName === undefined ||
      !Object.prototype.hasOwnProperty.call(this.#spec.pods, podName) ||
      !Object.prototype.hasOwnProperty.call(
        this.#spec.pods[podName]!.entries,
        entryName
      )
    ) {
      throw new Error(`Entry "${name}" does not exist`);
    }

    const entryType = this.#spec.pods[podName]!.entries[entryName]!;

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

    const statement: InRange<AllPODEntries<P>, N> = {
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

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
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
    // Check that the entry exists
    const [podName, entryName] = name.split(".");
    if (
      podName === undefined ||
      entryName === undefined ||
      !Object.prototype.hasOwnProperty.call(this.#spec.pods, podName) ||
      !Object.prototype.hasOwnProperty.call(
        this.#spec.pods[podName]!.entries,
        entryName
      )
    ) {
      throw new Error(`Entry "${name}" does not exist`);
    }

    const entryType = this.#spec.pods[podName]!.entries[entryName]!;

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

    const statement: NotInRange<AllPODEntries<P>, N> = {
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

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
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
    // Check that both entries exist
    const [pod1, entry1] = name1.split(".");
    const [pod2, entry2] = name2.split(".");
    if (
      pod1 === undefined ||
      entry1 === undefined ||
      !Object.prototype.hasOwnProperty.call(this.#spec.pods, pod1) ||
      !Object.prototype.hasOwnProperty.call(
        this.#spec.pods[pod1]!.entries,
        entry1
      )
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      pod2 === undefined ||
      entry2 === undefined ||
      !Object.prototype.hasOwnProperty.call(this.#spec.pods, pod2) ||
      !Object.prototype.hasOwnProperty.call(
        this.#spec.pods[pod2]!.entries,
        entry2
      )
    ) {
      throw new Error(`Entry "${name2}" does not exist`);
    }

    if ((name1 as string) === (name2 as string)) {
      throw new Error("Entry names must be different");
    }

    const type1 = this.#spec.pods[pod1]!.entries[entry1]!;
    const type2 = this.#spec.pods[pod2]!.entries[entry2]!;
    if (type1 !== type2) {
      throw new Error("Entry types must be the same");
    }

    const statement: GreaterThan<AllPODEntries<P>, N1, N2> = {
      entries: [name1, name2],
      type: "greaterThan",
    };

    const baseName = customStatementName ?? `${name1}_${name2}_greaterThan`;
    let statementName: string = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
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
    // Check that both entries exist
    const [pod1, entry1] = name1.split(".");
    const [pod2, entry2] = name2.split(".");
    if (
      pod1 === undefined ||
      entry1 === undefined ||
      !Object.prototype.hasOwnProperty.call(this.#spec.pods, pod1) ||
      !Object.prototype.hasOwnProperty.call(
        this.#spec.pods[pod1]!.entries,
        entry1
      )
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      pod2 === undefined ||
      entry2 === undefined ||
      !Object.prototype.hasOwnProperty.call(this.#spec.pods, pod2) ||
      !Object.prototype.hasOwnProperty.call(
        this.#spec.pods[pod2]!.entries,
        entry2
      )
    ) {
      throw new Error(`Entry "${name2}" does not exist`);
    }

    if ((name1 as string) === (name2 as string)) {
      throw new Error("Entry names must be different");
    }

    const type1 = this.#spec.pods[pod1]!.entries[entry1]!;
    const type2 = this.#spec.pods[pod2]!.entries[entry2]!;
    if (type1 !== type2) {
      throw new Error("Entry types must be the same");
    }

    const statement: GreaterThanEq<AllPODEntries<P>, N1, N2> = {
      entries: [name1, name2],
      type: "greaterThanEq",
    };

    const baseName = customStatementName ?? `${name1}_${name2}_greaterThanEq`;
    let statementName: string = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
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
    // Check that both entries exist
    const [pod1, entry1] = name1.split(".");
    const [pod2, entry2] = name2.split(".");
    if (
      pod1 === undefined ||
      entry1 === undefined ||
      !Object.prototype.hasOwnProperty.call(this.#spec.pods, pod1) ||
      !Object.prototype.hasOwnProperty.call(
        this.#spec.pods[pod1]!.entries,
        entry1
      )
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      pod2 === undefined ||
      entry2 === undefined ||
      !Object.prototype.hasOwnProperty.call(this.#spec.pods, pod2) ||
      !Object.prototype.hasOwnProperty.call(
        this.#spec.pods[pod2]!.entries,
        entry2
      )
    ) {
      throw new Error(`Entry "${name2}" does not exist`);
    }

    if ((name1 as string) === (name2 as string)) {
      throw new Error("Entry names must be different");
    }

    const type1 = this.#spec.pods[pod1]!.entries[entry1]!;
    const type2 = this.#spec.pods[pod2]!.entries[entry2]!;
    if (type1 !== type2) {
      throw new Error("Entry types must be the same");
    }

    const statement: LessThan<AllPODEntries<P>, N1, N2> = {
      entries: [name1, name2],
      type: "lessThan",
    };

    const baseName = customStatementName ?? `${name1}_${name2}_lessThan`;
    let statementName: string = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
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
    // Check that both entries exist
    const [pod1, entry1] = name1.split(".");
    const [pod2, entry2] = name2.split(".");
    if (
      pod1 === undefined ||
      entry1 === undefined ||
      !Object.prototype.hasOwnProperty.call(this.#spec.pods, pod1) ||
      !Object.prototype.hasOwnProperty.call(
        this.#spec.pods[pod1]!.entries,
        entry1
      )
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      pod2 === undefined ||
      entry2 === undefined ||
      !Object.prototype.hasOwnProperty.call(this.#spec.pods, pod2) ||
      !Object.prototype.hasOwnProperty.call(
        this.#spec.pods[pod2]!.entries,
        entry2
      )
    ) {
      throw new Error(`Entry "${name2}" does not exist`);
    }

    if ((name1 as string) === (name2 as string)) {
      throw new Error("Entry names must be different");
    }

    const type1 = this.#spec.pods[pod1]!.entries[entry1]!;
    const type2 = this.#spec.pods[pod2]!.entries[entry2]!;
    if (type1 !== type2) {
      throw new Error("Entry types must be the same");
    }

    const statement: LessThanEq<AllPODEntries<P>, N1, N2> = {
      entries: [name1, name2],
      type: "lessThanEq",
    };

    const baseName = customStatementName ?? `${name1}_${name2}_lessThanEq`;
    let statementName: string = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
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
    // Check that both entries exist
    const [pod1, entry1] = name1.split(".");
    const [pod2, entry2] = name2.split(".");
    if (
      pod1 === undefined ||
      entry1 === undefined ||
      !Object.prototype.hasOwnProperty.call(this.#spec.pods, pod1) ||
      (!Object.prototype.hasOwnProperty.call(
        this.#spec.pods[pod1]!.entries,
        entry1
      ) &&
        !Object.prototype.hasOwnProperty.call(virtualEntries, entry1))
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      pod2 === undefined ||
      entry2 === undefined ||
      !Object.prototype.hasOwnProperty.call(this.#spec.pods, pod2) ||
      (!Object.prototype.hasOwnProperty.call(
        this.#spec.pods[pod2]!.entries,
        entry2
      ) &&
        !Object.prototype.hasOwnProperty.call(virtualEntries, entry2))
    ) {
      throw new Error(`Entry "${name2}" does not exist`);
    }

    if ((name1 as string) === (name2 as string)) {
      throw new Error("Entry names must be different");
    }

    const type1 = this.#spec.pods[pod1]!.entries[entry1]!;
    const type2 = this.#spec.pods[pod2]!.entries[entry2]!;
    if (type1 !== type2) {
      throw new Error("Entry types must be the same");
    }

    const statement: EqualsEntry<AllPODEntries<P>, N1, N2> = {
      entries: [name1, name2],
      type: "equalsEntry",
    };

    const baseName = customStatementName ?? `${name1}_${name2}_equalsEntry`;
    let statementName: string = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
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
    // Check that both entries exist
    const [pod1, entry1] = name1.split(".");
    const [pod2, entry2] = name2.split(".");
    if (
      pod1 === undefined ||
      entry1 === undefined ||
      !Object.prototype.hasOwnProperty.call(this.#spec.pods, pod1) ||
      !Object.prototype.hasOwnProperty.call(
        this.#spec.pods[pod1]!.entries,
        entry1
      )
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      pod2 === undefined ||
      entry2 === undefined ||
      !Object.prototype.hasOwnProperty.call(this.#spec.pods, pod2) ||
      !Object.prototype.hasOwnProperty.call(
        this.#spec.pods[pod2]!.entries,
        entry2
      )
    ) {
      throw new Error(`Entry "${name2}" does not exist`);
    }

    if ((name1 as string) === (name2 as string)) {
      throw new Error("Entry names must be different");
    }

    const type1 = this.#spec.pods[pod1]!.entries[entry1]!;
    const type2 = this.#spec.pods[pod2]!.entries[entry2]!;
    if (type1 !== type2) {
      throw new Error("Entry types must be the same");
    }

    const statement: NotEqualsEntry<AllPODEntries<P>, N1, N2> = {
      entries: [name1, name2],
      type: "notEqualsEntry",
    };

    const baseName = customStatementName ?? `${name1}_${name2}_notEqualsEntry`;
    let statementName: string = baseName;
    let suffix = 1;

    while (
      Object.prototype.hasOwnProperty.call(this.#spec.statements, statementName)
    ) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
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
