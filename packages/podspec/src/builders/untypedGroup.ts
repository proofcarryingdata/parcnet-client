import {
  type PODName,
  type PODValue,
  POD_DATE_MAX,
  POD_DATE_MIN,
  POD_INT_MAX,
  POD_INT_MIN,
  checkPODName,
} from "@pcd/pod";
import type { NamedPODSpecs, PODGroupSpec } from "./group.js";
import { type PODSpec, PODSpecBuilder, virtualEntries } from "./pod.js";
import {
  convertValuesToStringTuples,
  deepFreeze,
  supportsRangeChecks,
  validateRange,
} from "./shared.js";
import type { EntryTypes, PODValueType } from "./types/entries.js";
import type {
  AnyEqualsEntry,
  AnyGreaterThan,
  AnyGreaterThanEq,
  AnyInRange,
  AnyIsMemberOf,
  AnyIsNotMemberOf,
  AnyLessThan,
  AnyLessThanEq,
  AnyNotEqualsEntry,
  AnyNotInRange,
  StatementMap,
} from "./types/statements.js";

export class UntypedPODGroupSpecBuilder {
  readonly #spec: PODGroupSpec<NamedPODSpecs, StatementMap>;

  private constructor(spec: PODGroupSpec<NamedPODSpecs, StatementMap>) {
    this.#spec = spec;
  }

  public static create() {
    return new UntypedPODGroupSpecBuilder({
      pods: {},
      statements: {},
    });
  }

  public spec(): PODGroupSpec<NamedPODSpecs, StatementMap> {
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

  public pod(
    name: PODName,
    spec: PODSpec<EntryTypes, StatementMap>
  ): UntypedPODGroupSpecBuilder {
    if (Object.prototype.hasOwnProperty.call(this.#spec.pods, name)) {
      throw new Error(`POD "${name}" already exists`);
    }

    // Will throw if the name is not valid.
    checkPODName(name);

    return new UntypedPODGroupSpecBuilder({
      ...this.#spec,
      pods: { ...this.#spec.pods, [name]: spec },
    });
  }

  public isMemberOf(
    names: [...PODName[]],
    values: PODValue["value"][] | PODValue["value"][][],
    customStatementName?: string
  ): UntypedPODGroupSpecBuilder {
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

    const statement: AnyIsMemberOf = {
      entries: names,
      type: "isMemberOf",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    return new UntypedPODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public isNotMemberOf(
    names: [...PODName[]],
    values: PODValue["value"][] | PODValue["value"][][],
    customStatementName?: string
  ): UntypedPODGroupSpecBuilder {
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

    const statement: AnyIsNotMemberOf = {
      entries: names,
      type: "isNotMemberOf",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    return new UntypedPODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public inRange(
    name: PODName,
    range: {
      min: bigint | Date;
      max: bigint | Date;
    },
    customStatementName?: string
  ): UntypedPODGroupSpecBuilder {
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

    const statement: AnyInRange = {
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

    return new UntypedPODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public notInRange(
    name: PODName,
    range: {
      min: bigint | Date;
      max: bigint | Date;
    },
    customStatementName?: string
  ): UntypedPODGroupSpecBuilder {
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

    const statement: AnyNotInRange = {
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

    return new UntypedPODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public greaterThan(
    name1: PODName,
    name2: PODName,
    customStatementName?: string
  ): UntypedPODGroupSpecBuilder {
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

    if (name1 === name2) {
      throw new Error("Entry names must be different");
    }

    const type1 = this.#spec.pods[pod1]!.entries[entry1]!;
    const type2 = this.#spec.pods[pod2]!.entries[entry2]!;
    if (type1 !== type2) {
      throw new Error("Entry types must be the same");
    }

    const statement: AnyGreaterThan = {
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

    return new UntypedPODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public greaterThanEq(
    name1: PODName,
    name2: PODName,
    customStatementName?: string
  ): UntypedPODGroupSpecBuilder {
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

    if (name1 === name2) {
      throw new Error("Entry names must be different");
    }

    const type1 = this.#spec.pods[pod1]!.entries[entry1]!;
    const type2 = this.#spec.pods[pod2]!.entries[entry2]!;
    if (type1 !== type2) {
      throw new Error("Entry types must be the same");
    }

    const statement: AnyGreaterThanEq = {
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

    return new UntypedPODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public lessThan(
    name1: PODName,
    name2: PODName,
    customStatementName?: string
  ): UntypedPODGroupSpecBuilder {
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

    if (name1 === name2) {
      throw new Error("Entry names must be different");
    }

    const type1 = this.#spec.pods[pod1]!.entries[entry1]!;
    const type2 = this.#spec.pods[pod2]!.entries[entry2]!;
    if (type1 !== type2) {
      throw new Error("Entry types must be the same");
    }

    const statement: AnyLessThan = {
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

    return new UntypedPODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public lessThanEq(
    name1: PODName,
    name2: PODName,
    customStatementName?: string
  ): UntypedPODGroupSpecBuilder {
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

    if (name1 === name2) {
      throw new Error("Entry names must be different");
    }

    const type1 = this.#spec.pods[pod1]!.entries[entry1]!;
    const type2 = this.#spec.pods[pod2]!.entries[entry2]!;
    if (type1 !== type2) {
      throw new Error("Entry types must be the same");
    }

    const statement: AnyLessThanEq = {
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

    return new UntypedPODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public equalsEntry(
    name1: PODName,
    name2: PODName,
    customStatementName?: string
  ): UntypedPODGroupSpecBuilder {
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

    if (name1 === name2) {
      throw new Error("Entry names must be different");
    }

    const type1 = this.#spec.pods[pod1]!.entries[entry1]!;
    const type2 = this.#spec.pods[pod2]!.entries[entry2]!;
    if (type1 !== type2) {
      throw new Error("Entry types must be the same");
    }

    const statement: AnyEqualsEntry = {
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

    return new UntypedPODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [statementName]: statement,
      },
    });
  }

  public notEqualsEntry(
    name1: PODName,
    name2: PODName,
    customStatementName?: string
  ): UntypedPODGroupSpecBuilder {
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

    if (name1 === name2) {
      throw new Error("Entry names must be different");
    }

    const type1 = this.#spec.pods[pod1]!.entries[entry1]!;
    const type2 = this.#spec.pods[pod2]!.entries[entry2]!;
    if (type1 !== type2) {
      throw new Error("Entry types must be the same");
    }

    const statement: AnyNotEqualsEntry = {
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

    return new UntypedPODGroupSpecBuilder({
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

      const _builder = UntypedPODGroupSpecBuilder.create()
        .pod("foo", pod.spec())
        .pod("bar", pod.spec())
        .inRange("foo.my_int", { min: 0n, max: 10n });
    });
  });
}

if (import.meta.vitest) {
  const { describe, it } = import.meta.vitest;

  describe("PODGroupSpecBuilder", () => {
    it("should be able to create a builder", () => {
      const pod = PODSpecBuilder.create()
        .entry("my_string", "string")
        .entry("my_int", "int")
        .entry("mystery_name", "string");

      const _builder = UntypedPODGroupSpecBuilder.create().pod(
        "foo",
        pod.spec()
      );
    });
  });
}
