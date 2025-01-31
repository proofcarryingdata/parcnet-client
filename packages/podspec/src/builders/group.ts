import { checkPODName, type PODName } from "@pcd/pod";
import { type PODSpec, PODSpecBuilder } from "./pod.js";
import type {
  EntryTypes,
  VirtualEntries,
  EntryKeys,
  PODValueTypeFromTypeName,
  PODValueTupleForNamedEntries,
  PODValueType
} from "./types/entries.js";
import type { StatementMap, IsMemberOf } from "./types/statements.js";
import { convertValuesToStringTuples } from "./shared.js";

type PODGroupPODs = Record<PODName, PODSpec<EntryTypes, StatementMap>>;

// @TODO add group constraints, where instead of extending EntryListSpec,
// we have some kind of group entry list, with each entry name prefixed
// by the name of the POD it belongs to.

// type GroupIsMemberOf<E extends EntryListSpec, N extends string[]> = {
//   entry: N[number];
//   type: "isMemberOf";
//   isMemberOf: N[number];
// };

export type PODGroupSpec<P extends PODGroupPODs, S extends StatementMap> = {
  pods: P;
  statements: S;
};

type AllPODEntries<P extends PODGroupPODs> = {
  [K in keyof P as `${K & string}.${keyof (P[K]["entries"] & VirtualEntries) &
    string}`]: P[K]["entries"][keyof P[K]["entries"] & string];
};

// Add this helper type to preserve literal types
type EntryType<
  P extends PODGroupPODs,
  K extends keyof AllPODEntries<P>
> = AllPODEntries<P>[K] extends PODValueType ? AllPODEntries<P>[K] : never;

// type AddEntry<
//   E extends EntryListSpec,
//   K extends keyof E,
//   V extends PODValueType
// > = Concrete<E & { [P in K]: { type: V } }>;

type Evaluate<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

type AddPOD<
  PODs extends PODGroupPODs,
  N extends PODName,
  Spec extends PODSpec<EntryTypes, StatementMap>
> = Evaluate<{
  [K in keyof PODs | N]: K extends N ? Spec : PODs[K & keyof PODs];
}>;

export class PODGroupSpecBuilder<
  P extends PODGroupPODs,
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
}

if (import.meta.vitest) {
  const { it, expect, assertType } = import.meta.vitest;

  it("PODGroupSpecBuilder", () => {
    const group = PODGroupSpecBuilder.create();
    const podBuilder = PODSpecBuilder.create().entry("my_string", "string");
    const groupWithPod = group.pod("foo", podBuilder.spec());
    const _spec = groupWithPod.spec();

    // Here we can see that, at the type level, we have the entry we defined
    // for the 'foo' pod, as well as the virtual entries.
    assertType<AllPODEntries<typeof _spec.pods>>({
      "foo.my_string": "string",
      "foo.$signerPublicKey": "string",
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
}
