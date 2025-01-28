import type { PODName } from "@pcd/pod";
import {
  PODSpecBuilderV2,
  type StatementMap,
  type PODSpecV2,
  type EntryTypes
} from "./podv2.js";

type PODGroupPODs = Record<PODName, PODSpecV2<EntryTypes, StatementMap>>;

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
  Spec extends PODSpecV2<EntryTypes, StatementMap>
> = Evaluate<{
  [K in keyof PODs | N]: K extends N ? Spec : PODs[K & keyof PODs];
}>;

class PODGroupSpecBuilder<
  PODs extends PODGroupPODs,
  Statements extends StatementMap
> {
  #spec: PODGroupSpec<PODs, Statements>;

  constructor(pods: PODs, statements: Statements) {
    this.#spec = {
      pods,
      statements
    };
  }

  public static create<PODs extends PODGroupPODs>(pods: PODs) {
    return new PODGroupSpecBuilder(pods, {});
  }

  public spec(): PODGroupSpec<PODs, Statements> {
    return this.#spec;
  }

  public pod<
    N extends PODName,
    Spec extends PODSpecV2<EntryTypes, StatementMap>,
    NewPods extends AddPOD<PODs, N, Spec>
  >(name: N, spec: Spec): PODGroupSpecBuilder<NewPods, Statements> {
    return new PODGroupSpecBuilder(
      { ...this.#spec.pods, [name]: spec } as unknown as NewPods,
      this.#spec.statements
    );
  }

  public isMemberOf<N extends PODName>(
    name: N
  ): PODGroupSpecBuilder<PODs, Statements> {
    return new PODGroupSpecBuilder(this.#spec.pods, {
      ...this.#spec.statements,
      [name]: { type: "isMemberOf", isMemberOf: name }
    });
  }
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it("PODGroupSpecBuilder", () => {
    const group = PODGroupSpecBuilder.create({});
    const podBuilder = PODSpecBuilderV2.create().entry("my_string", "string");
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
