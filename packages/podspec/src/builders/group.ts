import type {
  HasEntries,
  PodEntryStringsOfType,
  PodGroupSpec,
  PodGroupSpecPods,
  TupleSpec
} from "../types/group.js";

/**
 * @todo
 * - Add other constraints (equalsEntry, etc.)
 * - Add the ability to split out a single POD
 * - Add the ability to create a sub-group
 * - Merge groups
 * - Add some type parameter to keep track of tuples
 */

type Concrete<T> = T extends object ? { [K in keyof T]: T[K] } : T;

export class PodGroupBuilder<P extends PodGroupSpecPods> {
  private readonly tuples: TupleSpec<P>[] = [];
  private readonly constraints: unknown[] = [];
  private readonly spec: PodGroupSpec<P>;

  constructor(private readonly pods: P) {
    this.spec = {
      pods: pods
    };
  }

  public add<K extends string, T extends HasEntries>(
    key: K,
    pod: T
  ): PodGroupBuilder<Concrete<P & { [PK in K]: T }>> {
    return new PodGroupBuilder({ ...this.pods, [key]: pod } as Concrete<
      P & { [PK in K]: T }
    >);
  }

  public tuple(tuple: TupleSpec<P>) {
    this.tuples.push(tuple);
    return this;
  }

  public lessThan(
    entryPair1: PodEntryStringsOfType<P, "int">,
    entryPair2: PodEntryStringsOfType<P, "int">
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [pod1, entry1] = entryPair1.split(".");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [pod2, entry2] = entryPair2.split(".");
    return this;
  }

  public build(): PodGroupSpec<P> {
    return this.spec;
  }
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;
  it("can add a POD to the group", () => {
    const group = new PodGroupBuilder({
      pod1: {
        entries: {
          foo: { type: "int" },
          bar: { type: "string" }
        }
      }
    })
      .add("pod2", {
        entries: {
          foo: { type: "int" }
        }
      })
      .build();

    expect(group.pods.pod1).toEqual({
      entries: {
        foo: { type: "int" },
        bar: { type: "string" }
      }
    });
  });
}
