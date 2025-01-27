import type {
  EntriesSpec,
  EntryListSpec,
  EntrySpec
} from "../types/entries.js";

/**
 * Converts a complex type expression into its concrete, simplified form.
 * For example, converts Pick<{a: string}, 'a'> into {a: string}
 */
type Concrete<T> = T extends object ? { [K in keyof T]: T[K] } : T;

/**
 * @todo add some type parameter to keep track of tuples
 */
export class EntriesSpecBuilder<E extends EntryListSpec> {
  readonly #spec: EntriesSpec<E>;

  private constructor(spec: EntriesSpec<E>) {
    this.#spec = spec;
  }

  public static create<E extends EntryListSpec>(entries: E) {
    return new EntriesSpecBuilder<E>({ entries });
  }

  public add<K extends string, T extends EntrySpec>(
    key: Exclude<K, keyof E>,
    type: T
  ): EntriesSpecBuilder<Concrete<E & { [P in K]: T }>> {
    if (key in this.#spec.entries) {
      throw new ReferenceError(
        `Key ${key.toString()} already exists in entries: ${Object.keys(
          this.#spec.entries
        ).join(", ")}`
      );
    }
    return new EntriesSpecBuilder<Concrete<E & { [P in K]: T }>>({
      entries: {
        ...this.#spec.entries,
        [key]: type
      } as Concrete<E & { [P in K]: T }>
    });
  }

  public pick<const K extends readonly (keyof E)[]>(
    keys: K
  ): EntriesSpecBuilder<Concrete<Pick<E, K[number]>>> {
    return new EntriesSpecBuilder<Concrete<Pick<E, K[number]>>>({
      entries: keys.reduce(
        (acc, key) => {
          if (!(key in this.#spec.entries)) {
            throw new ReferenceError(
              `Key ${key.toString()} not found in entries: ${Object.keys(
                this.#spec.entries
              ).join(", ")}`
            );
          }
          return {
            ...acc,
            [key]: this.#spec.entries[key]
          };
        },
        {} as Concrete<Pick<E, K[number]>>
      )
    });
  }

  public omit<const K extends readonly (keyof E)[]>(
    keys: K,
    { strict = true }: { strict?: boolean } = {}
  ): EntriesSpecBuilder<Concrete<Omit<E, K[number]>>> {
    if (strict) {
      for (const key of keys) {
        if (!(key in this.#spec.entries)) {
          throw new ReferenceError(
            `Key ${key.toString()} not found in entries: ${Object.keys(
              this.#spec.entries
            ).join(", ")}`
          );
        }
      }
    }
    return new EntriesSpecBuilder<Concrete<Omit<E, K[number]>>>({
      entries: Object.fromEntries(
        Object.entries(this.#spec.entries).filter(
          ([key]) => !keys.includes(key)
        )
      ) as Concrete<Omit<E, K[number]>>
    });
  }

  public merge<F extends EntryListSpec>(
    other: EntriesSpecBuilder<F>
  ): EntriesSpecBuilder<Concrete<E & F>> {
    return new EntriesSpecBuilder<Concrete<E & F>>({
      entries: {
        ...this.#spec.entries,
        ...other.#spec.entries
      } as Concrete<E & F>
    });
  }

  public build(): EntriesSpec<E> {
    return structuredClone(this.#spec);
  }
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("EntriesSpecBuilder", () => {
    it("should add entries correctly", () => {
      const nameAndAgeBuilder = EntriesSpecBuilder.create({
        name: {
          type: "string"
        }
      }).add("age", { type: "int" });

      expect(nameAndAgeBuilder.build()).toEqual({
        name: { type: "string" },
        age: { type: "int" }
      });

      nameAndAgeBuilder satisfies EntriesSpecBuilder<{
        name: { type: "string" };
        age: { type: "int" };
      }>;

      const nameBuilder = nameAndAgeBuilder.pick(["name"]);
      nameBuilder satisfies EntriesSpecBuilder<{
        name: { type: "string" };
      }>;
      // @ts-expect-error age is not in the builder
      nameBuilder satisfies EntriesSpecBuilder<{
        age: { type: "int" };
      }>;

      expect(nameBuilder.build()).toEqual({
        name: { type: "string" }
      });

      // @ts-expect-error nonExistingKey will not type-check, but we want to
      // test the error for cases where the caller is not using TypeScript
      expect(() => nameAndAgeBuilder.pick(["nonExistingKey"])).to.throw(
        ReferenceError
      );

      expect(nameAndAgeBuilder.omit(["name"]).build()).toEqual({
        age: { type: "int" }
      });

      expect(
        nameAndAgeBuilder.omit(["name"], { strict: false }).build()
      ).toEqual({
        age: { type: "int" }
      });

      nameAndAgeBuilder.omit(["name"]) satisfies EntriesSpecBuilder<{
        age: { type: "int" };
      }>;

      // @ts-expect-error nonExistingKey will not type-check, but we want to
      // test the error for cases where the caller is not using TypeScript
      expect(() => nameAndAgeBuilder.omit(["nonExistingKey"])).to.throw(
        ReferenceError
      );

      expect(() =>
        nameAndAgeBuilder.omit(["name"], { strict: false })
      ).not.to.throw(ReferenceError);
    });
  });
}
