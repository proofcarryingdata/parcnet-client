import type { EntryListSpec } from "../types/entries.js";
import type { PODSpec, PODTupleSpec, PODTuplesSpec } from "../types/pod.js";

export class PODSpecBuilder<E extends EntryListSpec> {
  readonly #spec: PODSpec<E>;

  private constructor(spec: PODSpec<E>) {
    this.#spec = spec;
  }

  public static create<E extends EntryListSpec>(entries: E): PODSpecBuilder<E> {
    return new PODSpecBuilder({ entries, tuples: {} as PODTuplesSpec<E> });
  }

  /**
   * Add a tuple constraint to the schema
   */
  tuple<N extends string, K extends (keyof E)[]>(
    name: N,
    tuple: { entries: [...K] } & Omit<PODTupleSpec<E, K>, "entries">
  ): PODSpecBuilder<E> {
    if (name in this.#spec.tuples) {
      throw new ReferenceError(
        `Tuple ${name.toString()} already exists: ${Object.keys(
          this.#spec.tuples
        ).join(", ")}`
      );
    }
    return new PODSpecBuilder({
      ...this.#spec,
      tuples: {
        ...this.#spec.tuples,
        [name]: tuple
      } as PODTuplesSpec<E>
    });
  }

  /**
   * Pick tuples by name
   *
   * @todo Make the names type-safe for better DX
   */
  pickTuples(names: string[]) {
    return new PODSpecBuilder({
      ...this.#spec,
      tuples: Object.fromEntries(
        Object.entries(this.#spec.tuples).filter(([name]) =>
          names.includes(name)
        )
      )
    });
  }

  /**
   * Omit tuples by name
   *
   * @todo Make the names type-safe for better DX
   */
  omitTuples(names: string[]) {
    return new PODSpecBuilder({
      ...this.#spec,
      tuples: Object.fromEntries(
        Object.entries(this.#spec.tuples).filter(
          ([name]) => !names.includes(name)
        )
      )
    });
  }

  /**
   * Configure signer public key constraints
   */
  signerPublicKey(config: {
    isRevealed?: boolean;
    isMemberOf?: string[];
    isNotMemberOf?: string[];
  }): PODSpecBuilder<E> {
    return new PODSpecBuilder({
      ...this.#spec,
      signerPublicKey: config
    });
  }

  /**
   * Configure signature constraints
   */
  signature(config: {
    isMemberOf?: string[];
    isNotMemberOf?: string[];
  }): PODSpecBuilder<E> {
    return new PODSpecBuilder({
      ...this.#spec,
      signature: config
    });
  }

  /**
   * Set metadata for the schema
   */
  meta(config: { labelEntry: keyof E & string }): PODSpecBuilder<E> {
    return new PODSpecBuilder({
      ...this.#spec,
      meta: config
    });
  }

  /**
   * Build and return the final POD schema
   */
  build(): PODSpec<E> {
    return structuredClone(this.#spec);
  }

  /**
   * Pick entries by key
   */
  pick<K extends keyof E>(keys: K[]): PODSpecBuilder<Pick<E, K>> {
    // Remove tuples whose keys are not picked
    const tuples = Object.fromEntries(
      Object.entries(this.#spec.tuples).filter(([_key, tuple]) =>
        tuple.entries.every(
          (entry) => entry === "$signerPublicKey" || keys.includes(entry as K)
        )
      )
    );

    // If the labelEntry is picked, keep it, otherwise remove it
    const meta = this.#spec.meta?.labelEntry
      ? keys.includes(this.#spec.meta.labelEntry as K)
        ? this.#spec.meta
        : undefined
      : undefined;

    return new PODSpecBuilder({
      ...this.#spec,
      entries: Object.fromEntries(
        keys.map((k) => [k, this.#spec.entries[k]])
      ) as Pick<E, K>,
      tuples,
      meta
    } as PODSpec<Pick<E, K>>);
  }
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;
  it("add", () => {
    const pod = PODSpecBuilder.create({
      name: { type: "string" },
      age: { type: "int" }
    }).tuple("foo", {
      entries: ["name"],
      isMemberOf: [[{ type: "string", value: "foo" }]]
    });

    const output = pod.build();

    expect(output).toEqual({
      entries: { name: { type: "string" }, age: { type: "int" } },
      tuples: {
        foo: {
          entries: ["name"],
          isMemberOf: [[{ type: "string", value: "foo" }]]
        }
      }
    });
  });
}
