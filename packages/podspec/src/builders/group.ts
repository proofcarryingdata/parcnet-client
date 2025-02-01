import {
  checkPODName,
  POD_DATE_MAX,
  POD_DATE_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  type PODName
} from "@pcd/pod";
import { type PODSpec, PODSpecBuilder } from "./pod.js";
import type {
  EntryTypes,
  VirtualEntries,
  EntryKeys,
  PODValueTypeFromTypeName,
  PODValueTupleForNamedEntries,
  PODValueType,
  EntriesOfType
} from "./types/entries.js";
import type {
  StatementMap,
  IsMemberOf,
  IsNotMemberOf,
  InRange,
  NotInRange,
  EqualsEntry,
  NotEqualsEntry,
  GreaterThan,
  GreaterThanEq,
  LessThan,
  LessThanEq,
  SupportsRangeChecks
} from "./types/statements.js";
import {
  convertValuesToStringTuples,
  supportsRangeChecks,
  validateRange
} from "./shared.js";

export type NamedPODSpecs = Record<PODName, PODSpec<EntryTypes, StatementMap>>;

// @TODO add group constraints, where instead of extending EntryListSpec,
// we have some kind of group entry list, with each entry name prefixed
// by the name of the POD it belongs to.

// type GroupIsMemberOf<E extends EntryListSpec, N extends string[]> = {
//   entry: N[number];
//   type: "isMemberOf";
//   isMemberOf: N[number];
// };

export type PODGroupSpec<P extends NamedPODSpecs, S extends StatementMap> = {
  pods: P;
  statements: S;
};

type AllPODEntries<P extends NamedPODSpecs> = {
  [K in keyof P]: {
    [E in keyof (P[K]["entries"] & VirtualEntries) as `${K & string}.${E &
      string}`]: (P[K]["entries"] & VirtualEntries)[E];
  };
}[keyof P];

type MustBePODValueType<T> = T extends PODValueType ? T : never;

type EntryType<
  P extends NamedPODSpecs,
  K extends keyof AllPODEntries<P>
> = MustBePODValueType<AllPODEntries<P>[K]>;

type Evaluate<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

type AddPOD<
  PODs extends NamedPODSpecs,
  N extends PODName,
  Spec extends PODSpec<EntryTypes, StatementMap>
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
  S extends StatementMap
> {
  readonly #spec: PODGroupSpec<P, S>;

  private constructor(spec: PODGroupSpec<P, S>) {
    this.#spec = spec;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  public static create(): PODGroupSpecBuilder<{}, {}> {
    return new PODGroupSpecBuilder({
      pods: {},
      statements: {}
    });
  }

  public spec(): PODGroupSpec<P, S> {
    return structuredClone(this.#spec);
  }

  public pod<
    N extends PODName,
    Spec extends PODSpec<EntryTypes, StatementMap>,
    NewPods extends AddPOD<P, N, Spec>
  >(name: N, spec: Spec): PODGroupSpecBuilder<NewPods, S> {
    if (name in this.#spec.pods) {
      throw new Error(`POD "${name}" already exists`);
    }

    // Will throw if the name is not valid.
    checkPODName(name);

    return new PODGroupSpecBuilder({
      ...this.#spec,
      pods: { ...this.#spec.pods, [name]: spec } as unknown as NewPods
    });
  }

  public isMemberOf<N extends EntryKeys<AllPODEntries<P>>>(
    names: [...N],
    values: N["length"] extends 1
      ? PODValueTypeFromTypeName<EntryType<P, N[0] & keyof AllPODEntries<P>>>[]
      : PODValueTupleForNamedEntries<AllPODEntries<P>, N>[]
  ): PODGroupSpecBuilder<P, S> {
    // Check that all names exist in entries
    for (const name of names) {
      const [podName, entryName] = name.split(".");
      if (
        podName === undefined ||
        entryName === undefined ||
        !(podName in this.#spec.pods) ||
        !(entryName in this.#spec.pods[podName]!.entries)
      ) {
        throw new Error(`Entry "${name}" does not exist`);
      }
    }

    // Check for duplicate names
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      throw new Error("Duplicate entry names are not allowed");
    }

    const statement: IsMemberOf<AllPODEntries<P>, N> = {
      entries: names,
      type: "isMemberOf",
      isMemberOf: convertValuesToStringTuples<N>(names, values)
    };

    const baseName = `${names.join("_")}_isMemberOf`;
    let statementName = baseName;
    let suffix = 1;

    while (statementName in this.#spec.statements) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
      }
    });
  }

  public isNotMemberOf<N extends EntryKeys<AllPODEntries<P>>>(
    names: [...N],
    values: N["length"] extends 1
      ? PODValueTypeFromTypeName<EntryType<P, N[0] & keyof AllPODEntries<P>>>[]
      : PODValueTupleForNamedEntries<AllPODEntries<P>, N>[]
  ): PODGroupSpecBuilder<P, S> {
    // Check that all names exist in entries
    for (const name of names) {
      const [podName, entryName] = name.split(".");
      if (
        podName === undefined ||
        entryName === undefined ||
        !(podName in this.#spec.pods) ||
        !(entryName in this.#spec.pods[podName]!.entries)
      ) {
        throw new Error(`Entry "${name}" does not exist`);
      }
    }

    // Check for duplicate names
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      throw new Error("Duplicate entry names are not allowed");
    }

    const statement: IsNotMemberOf<AllPODEntries<P>, N> = {
      entries: names,
      type: "isNotMemberOf",
      isNotMemberOf: convertValuesToStringTuples<N>(names, values)
    };

    const baseName = `${names.join("_")}_isNotMemberOf`;
    let statementName = baseName;
    let suffix = 1;

    while (statementName in this.#spec.statements) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
      }
    });
  }

  public inRange<
    N extends keyof EntriesOfType<AllPODEntries<P>, SupportsRangeChecks> &
      string
  >(
    name: N,
    range: {
      min: AllPODEntries<P>[N] extends "date" ? Date : bigint;
      max: AllPODEntries<P>[N] extends "date" ? Date : bigint;
    }
  ): PODGroupSpecBuilder<P, S> {
    // Check that the entry exists
    const [podName, entryName] = name.split(".");
    if (
      podName === undefined ||
      entryName === undefined ||
      !(podName in this.#spec.pods) ||
      !(entryName in this.#spec.pods[podName]!.entries)
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

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
      }
    });
  }

  public notInRange<
    N extends keyof EntriesOfType<AllPODEntries<P>, SupportsRangeChecks> &
      string
  >(
    name: N,
    range: {
      min: AllPODEntries<P>[N] extends "date" ? Date : bigint;
      max: AllPODEntries<P>[N] extends "date" ? Date : bigint;
    }
  ): PODGroupSpecBuilder<P, S> {
    // Check that the entry exists
    const [podName, entryName] = name.split(".");
    if (
      podName === undefined ||
      entryName === undefined ||
      !(podName in this.#spec.pods) ||
      !(entryName in this.#spec.pods[podName]!.entries)
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

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
      }
    });
  }

  public greaterThan<
    N1 extends keyof AllPODEntries<P> & string,
    N2 extends keyof EntriesOfType<AllPODEntries<P>, EntryType<P, N1>> & string
  >(name1: N1, name2: N2): PODGroupSpecBuilder<P, S> {
    // Check that both entries exist
    const [pod1, entry1] = name1.split(".");
    const [pod2, entry2] = name2.split(".");
    if (
      pod1 === undefined ||
      entry1 === undefined ||
      !(pod1 in this.#spec.pods) ||
      !(entry1 in this.#spec.pods[pod1]!.entries)
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      pod2 === undefined ||
      entry2 === undefined ||
      !(pod2 in this.#spec.pods) ||
      !(entry2 in this.#spec.pods[pod2]!.entries)
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
      entry: name1,
      type: "greaterThan",
      otherEntry: name2
    };

    const baseName = `${name1}_${name2}_greaterThan`;
    let statementName = baseName;
    let suffix = 1;

    while (statementName in this.#spec.statements) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
      }
    });
  }

  public greaterThanEq<
    N1 extends keyof AllPODEntries<P> & string,
    N2 extends keyof EntriesOfType<AllPODEntries<P>, EntryType<P, N1>> & string
  >(name1: N1, name2: N2): PODGroupSpecBuilder<P, S> {
    // Check that both entries exist
    const [pod1, entry1] = name1.split(".");
    const [pod2, entry2] = name2.split(".");
    if (
      pod1 === undefined ||
      entry1 === undefined ||
      !(pod1 in this.#spec.pods) ||
      !(entry1 in this.#spec.pods[pod1]!.entries)
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      pod2 === undefined ||
      entry2 === undefined ||
      !(pod2 in this.#spec.pods) ||
      !(entry2 in this.#spec.pods[pod2]!.entries)
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
      entry: name1,
      type: "greaterThanEq",
      otherEntry: name2
    };

    const baseName = `${name1}_${name2}_greaterThanEq`;
    let statementName = baseName;
    let suffix = 1;

    while (statementName in this.#spec.statements) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
      }
    });
  }

  public lessThan<
    N1 extends keyof AllPODEntries<P> & string,
    N2 extends keyof EntriesOfType<AllPODEntries<P>, EntryType<P, N1>> & string
  >(name1: N1, name2: N2): PODGroupSpecBuilder<P, S> {
    // Check that both entries exist
    const [pod1, entry1] = name1.split(".");
    const [pod2, entry2] = name2.split(".");
    if (
      pod1 === undefined ||
      entry1 === undefined ||
      !(pod1 in this.#spec.pods) ||
      !(entry1 in this.#spec.pods[pod1]!.entries)
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      pod2 === undefined ||
      entry2 === undefined ||
      !(pod2 in this.#spec.pods) ||
      !(entry2 in this.#spec.pods[pod2]!.entries)
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
      entry: name1,
      type: "lessThan",
      otherEntry: name2
    };

    const baseName = `${name1}_${name2}_lessThan`;
    let statementName = baseName;
    let suffix = 1;

    while (statementName in this.#spec.statements) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
      }
    });
  }

  public lessThanEq<
    N1 extends keyof AllPODEntries<P> & string,
    N2 extends keyof EntriesOfType<AllPODEntries<P>, EntryType<P, N1>> & string
  >(name1: N1, name2: N2): PODGroupSpecBuilder<P, S> {
    // Check that both entries exist
    const [pod1, entry1] = name1.split(".");
    const [pod2, entry2] = name2.split(".");
    if (
      pod1 === undefined ||
      entry1 === undefined ||
      !(pod1 in this.#spec.pods) ||
      !(entry1 in this.#spec.pods[pod1]!.entries)
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      pod2 === undefined ||
      entry2 === undefined ||
      !(pod2 in this.#spec.pods) ||
      !(entry2 in this.#spec.pods[pod2]!.entries)
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
      entry: name1,
      type: "lessThanEq",
      otherEntry: name2
    };

    const baseName = `${name1}_${name2}_lessThanEq`;
    let statementName = baseName;
    let suffix = 1;

    while (statementName in this.#spec.statements) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
      }
    });
  }

  public equalsEntry<
    N1 extends keyof AllPODEntries<P> & string,
    N2 extends keyof EntriesOfType<AllPODEntries<P>, EntryType<P, N1>> & string
  >(name1: N1, name2: N2): PODGroupSpecBuilder<P, S> {
    // Check that both entries exist
    const [pod1, entry1] = name1.split(".");
    const [pod2, entry2] = name2.split(".");
    if (
      pod1 === undefined ||
      entry1 === undefined ||
      !(pod1 in this.#spec.pods) ||
      !(entry1 in this.#spec.pods[pod1]!.entries)
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      pod2 === undefined ||
      entry2 === undefined ||
      !(pod2 in this.#spec.pods) ||
      !(entry2 in this.#spec.pods[pod2]!.entries)
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
      entry: name1,
      type: "equalsEntry",
      otherEntry: name2
    };

    const baseName = `${name1}_${name2}_equalsEntry`;
    let statementName = baseName;
    let suffix = 1;

    while (statementName in this.#spec.statements) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
      }
    });
  }

  public notEqualsEntry<
    N1 extends keyof AllPODEntries<P> & string,
    N2 extends keyof EntriesOfType<AllPODEntries<P>, EntryType<P, N1>> & string
  >(name1: N1, name2: N2): PODGroupSpecBuilder<P, S> {
    // Check that both entries exist
    const [pod1, entry1] = name1.split(".");
    const [pod2, entry2] = name2.split(".");
    if (
      pod1 === undefined ||
      entry1 === undefined ||
      !(pod1 in this.#spec.pods) ||
      !(entry1 in this.#spec.pods[pod1]!.entries)
    ) {
      throw new Error(`Entry "${name1}" does not exist`);
    }
    if (
      pod2 === undefined ||
      entry2 === undefined ||
      !(pod2 in this.#spec.pods) ||
      !(entry2 in this.#spec.pods[pod2]!.entries)
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
      entry: name1,
      type: "notEqualsEntry",
      otherEntry: name2
    };

    const baseName = `${name1}_${name2}_notEqualsEntry`;
    let statementName = baseName;
    let suffix = 1;

    while (statementName in this.#spec.statements) {
      statementName = `${baseName}_${suffix++}`;
    }

    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement
      }
    });
  }
}

if (import.meta.vitest) {
  const { it, expect, assertType } = import.meta.vitest;

  it("PODGroupSpecBuilder", () => {
    const group = PODGroupSpecBuilder.create();
    const podBuilder = PODSpecBuilder.create()
      .entry("my_string", "string")
      .entry("my_num", "int");
    const groupWithPod = group.pod("foo", podBuilder.spec());
    const _spec = groupWithPod.spec();

    // Here we can see that, at the type level, we have the entry we defined
    // for the 'foo' pod, as well as the virtual entries.
    assertType<AllPODEntries<typeof _spec.pods>>({
      "foo.my_string": "string",
      "foo.my_num": "int",
      "foo.$signerPublicKey": "eddsa_pubkey",
      "foo.$contentID": "string",
      "foo.$signature": "string"
    });

    expect(groupWithPod.spec()).toEqual({
      pods: {
        foo: podBuilder.spec()
      },
      statements: {}
    });

    const groupWithPodAndStatement = groupWithPod.isMemberOf(
      ["foo.my_string"],
      ["hello"]
    );
    const spec3 = groupWithPodAndStatement.spec();

    expect(spec3).toEqual({
      pods: {
        foo: podBuilder.spec()
      },
      statements: {
        "foo.my_string_isMemberOf": {
          entries: ["foo.my_string"],
          isMemberOf: [["hello"]],
          type: "isMemberOf"
        }
      }
    });
  });

  it("debug equalsEntry types", () => {
    const group = PODGroupSpecBuilder.create();
    const podBuilder = PODSpecBuilder.create()
      .entry("my_string", "string")
      .entry("my_other_string", "string")
      .entry("my_num", "int")
      .entry("my_other_num", "int");

    const groupWithPod = group.pod("foo", podBuilder.spec());

    // This should show us the concrete types
    assertType<AllPODEntries<ReturnType<typeof groupWithPod.spec>["pods"]>>({
      "foo.my_string": "string",
      "foo.my_other_string": "string",
      "foo.my_num": "int",
      "foo.my_other_num": "int",
      "foo.$contentID": "string",
      "foo.$signature": "string",
      "foo.$signerPublicKey": "eddsa_pubkey"
    });

    groupWithPod.equalsEntry("foo.my_num", "foo.my_other_num");

    // Now let's try to see what happens in equalsEntry
    type _T1 = Parameters<typeof groupWithPod.equalsEntry>[0]; // First parameter type
    type _T2 = Parameters<typeof groupWithPod.equalsEntry>[1]; // Second parameter type
  });

  it("debug AllPODEntries types", () => {
    const group = PODGroupSpecBuilder.create();
    const podBuilder = PODSpecBuilder.create()
      .entry("my_string", "string")
      .entry("my_other_string", "string")
      .entry("my_num", "int");

    const _groupWithPod = group.pod("foo", podBuilder.spec());

    type TestPods = ReturnType<typeof _groupWithPod.spec>["pods"];

    // Verify type equivalence
    type TestPodEntries = PodTest<TestPods>;

    // Check that entries are exactly the types we expect
    type Test1 = TestPodEntries["foo.my_string"] extends "string"
      ? true
      : false; // should be true
    type Test2 = "string" extends TestPodEntries["foo.my_string"]
      ? true
      : false; // should be true
    type Test3 = TestPodEntries["foo.my_num"] extends "int" ? true : false; // should be true
    type Test4 = "int" extends TestPodEntries["foo.my_num"] ? true : false; // should be true

    // Verify that the types are exactly equal
    type Test5 = TestPodEntries["foo.my_string"] extends "string"
      ? true
      : false; // should be true

    assertType<Test1>(true);
    assertType<Test2>(true);
    assertType<Test3>(true);
    assertType<Test4>(true);
    assertType<Test5>(true);
  });
}

type PodTest<P extends NamedPODSpecs> = {
  [K in keyof P]: {
    [E in keyof (P[K]["entries"] & VirtualEntries) as `${K & string}.${E &
      string}`]: (P[K]["entries"] & VirtualEntries)[E];
  };
}[keyof P];
