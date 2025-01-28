import { checkPODName, type PODName } from "@pcd/pod";
import {
  PODSpecBuilder,
  type StatementMap,
  type PODSpec,
  type EntryTypes
} from "./pod.js";

type PODGroupPODs = Record<PODName, PODSpec<EntryTypes, StatementMap>>;

// @TODO add group constraints, where instead of extending EntryListSpec,
// we have some kind of group entry list, with each entry name prefixed
// by the name of the POD it belongs to.

// type GroupIsMemberOf<E extends EntryListSpec, N extends string[]> = {
//   entry: N[number];
//   type: "isMemberOf";
//   isMemberOf: N[number];
// };

type PODGroupSpec<
  PODs extends PODGroupPODs,
  Statements extends StatementMap
> = {
  pods: PODs;
  statements: Statements;
};

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

class PODGroupSpecBuilder<
  PODs extends PODGroupPODs,
  Statements extends StatementMap
> {
  readonly #spec: PODGroupSpec<PODs, Statements>;
  static #isInternalConstructing = false;

  private constructor(spec: PODGroupSpec<PODs, Statements>) {
    if (PODGroupSpecBuilder.#isInternalConstructing) {
      throw new Error("PODGroupSpecBuilder is not constructable");
    }
    PODGroupSpecBuilder.#isInternalConstructing = false;
    this.#spec = spec;
  }

  public static create() {
    // JavaScript does not have true private constructors, so we use a static
    // variable to prevent construction.
    PODGroupSpecBuilder.#isInternalConstructing = true;
    return new PODGroupSpecBuilder({
      pods: {},
      statements: {}
    });
  }

  public spec(): PODGroupSpec<PODs, Statements> {
    return structuredClone(this.#spec);
  }

  public pod<
    N extends PODName,
    Spec extends PODSpec<EntryTypes, StatementMap>,
    NewPods extends AddPOD<PODs, N, Spec>
  >(name: N, spec: Spec): PODGroupSpecBuilder<NewPods, Statements> {
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

  public isMemberOf<N extends PODName>(
    name: N
  ): PODGroupSpecBuilder<PODs, Statements> {
    return new PODGroupSpecBuilder({
      ...this.#spec,
      statements: {
        ...this.#spec.statements,
        [name]: { type: "isMemberOf", isMemberOf: name }
      }
    });
  }
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it("PODGroupSpecBuilder", () => {
    const group = PODGroupSpecBuilder.create();
    const podBuilder = PODSpecBuilder.create().entry("my_string", "string");
    const group2 = group.pod("foo", podBuilder.spec());
    const spec = group2.spec();
    expect(group2.spec()).toEqual({
      pods: {
        foo: podBuilder.spec()
      },
      statements: {}
    });
  });
}
