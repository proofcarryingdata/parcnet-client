import { fc, test } from "@fast-check/vitest";
import { describe, expect, it } from "vitest";
import type { PODValueType } from "../../src/builders/types/entries.js";
import type { EqualsEntry } from "../../src/builders/types/statements.js";
import { PODSpecBuilder } from "../../src/index.js";

/*
  @todo
  - [ ] Adding statements of each kind
    - [ ] isMemberOf
    - [ ] isNotMemberOf
    - [ ] inRange
    - [ ] notInRange
    - [ ] equalsEntry
    - [ ] notEqualsEntry
    - [ ] greaterThan
    - [ ] greaterThanEq
    - [ ] lessThan
    - [ ] lessThanEq
  - [x] Custom statement names
  - [ ] Pick entries
  - [ ] Pick statements
  - [ ] Omit entries
  - [ ] Omit statements
  - [ ] Spec output matches expected output
    - [ ] Test outputs for all of the above cases
  - [ ] Erroneous inputs of all kinds
*/

describe("PODSpecBuilder", () => {
  it("PODSpecBuilder", () => {
    const a = PODSpecBuilder.create().entry("zzz", "string");
    const b = a.entry("a", "string").entry("b", "int");
    expect(b.spec().entries).toEqual({
      a: "string",
      b: "int",
      zzz: "string",
    });

    b.isMemberOf(["zzz"], ["fooo"]);
    const c = b.isMemberOf(["a"], ["foo"]);
    expect(c.spec().statements).toEqual({
      a_isMemberOf: {
        entries: ["a"],
        type: "isMemberOf",
        isMemberOf: [["foo"]],
      },
    });

    const d = c.inRange("b", { min: 10n, max: 100n });
    expect(d.spec().statements).toEqual({
      a_isMemberOf: {
        entries: ["a"],
        type: "isMemberOf",
        isMemberOf: [["foo"]],
      },
      b_inRange: {
        entries: ["b"],
        type: "inRange",
        inRange: { min: "10", max: "100" },
      },
    });

    const e = d.isMemberOf(["a", "b"], [["foo", 10n]]);
    expect(e.spec().statements.a_b_isMemberOf.entries).toEqual(["a", "b"]);

    const f = e.pickEntries(["b"]);
    expect(f.spec().statements).toEqual({
      b_inRange: {
        entries: ["b"],
        type: "inRange",
        inRange: { min: "10", max: "100" },
      },
    });

    const g = e.entry("new", "string").equalsEntry("a", "new");
    const _GSpec = g.spec();
    const _GEntries = _GSpec.entries;
    type EntriesType = typeof _GEntries;
    _GSpec.statements.a_new_equalsEntry satisfies EqualsEntry<
      EntriesType,
      "a",
      "new"
    >;

    expect(g.spec().statements).toMatchObject({
      a_new_equalsEntry: {
        entries: ["a", "new"],
        type: "equalsEntry",
      },
    });

    expect(g.spec()).toEqual({
      entries: {
        a: "string",
        b: "int",
        new: "string",
        zzz: "string",
      },
      statements: {
        a_isMemberOf: {
          entries: ["a"],
          type: "isMemberOf",
          isMemberOf: [["foo"]],
        },
        a_b_isMemberOf: {
          entries: ["a", "b"],
          type: "isMemberOf",
          // Note that the values are strings here, because we convert them to
          // strings when persisting the spec.
          isMemberOf: [["foo", "10"]],
        },
        b_inRange: {
          entries: ["b"],
          type: "inRange",
          // Note that the values are strings here, because we convert them to
          // strings when persisting the spec.
          inRange: { min: "10", max: "100" },
        },
        a_new_equalsEntry: {
          entries: ["a", "new"],
          type: "equalsEntry",
        },
      },
    } satisfies typeof _GSpec);

    const h = g.pickStatements(["a_isMemberOf"]);
    expect(h.spec().statements).toEqual({
      a_isMemberOf: {
        entries: ["a"],
        type: "isMemberOf",
        isMemberOf: [["foo"]],
      },
    });
  });
});

describe("PODSpecBuilder - Property tests", () => {
  // Arbitraries for generating test data
  const validEntryName = fc
    .string()
    .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s))
    .filter((s) => s.length <= 32);

  const podType = fc.constantFrom(
    "string",
    "int",
    "boolean",
    "date",
    "eddsa_pubkey"
  );

  const entryConfigs = fc
    .uniqueArray(validEntryName, {
      minLength: 1,
      maxLength: 10,
    })
    .map((names) =>
      names.map((name) => ({
        name,
        type: fc.sample(podType, 1)[0] as PODValueType,
      }))
    );

  // Test that adding entries is commutative
  test("should be commutative when adding entries", () => {
    fc.assert(
      fc.property(entryConfigs, (entries) => {
        // Add entries in original order
        const builder1 = entries.reduce(
          (b, { name, type }) => b.entry(name, type),
          PODSpecBuilder.create()
        );

        // Add entries in reverse order
        const builder2 = [...entries]
          .reverse()
          .reduce(
            (b, { name, type }) => b.entry(name, type),
            PODSpecBuilder.create()
          );

        // The resulting specs should be equivalent
        expect(builder1.spec()).toEqual(builder2.spec());
      })
    );
  });

  // Test that picking and then omitting entries is consistent
  test("should maintain consistency when picking and omitting entries", () => {
    fc.assert(
      fc.property(
        entryConfigs,
        fc.array(fc.nat(), { minLength: 1, maxLength: 5 }), // indices to pick
        (entries, pickIndices) => {
          const builder = entries.reduce(
            (b, { name, type }) => b.entry(name, type),
            PODSpecBuilder.create()
          );
          const entryNames = entries.map((e) => e.name);
          const pickedNames = pickIndices
            .map((i) => entryNames[i % entryNames.length])
            .filter((name): name is string => name !== undefined);

          const picked = builder.pickEntries(pickedNames);
          const omitted = picked.omitEntries(pickedNames);

          // Omitting all picked entries should result in empty entries
          expect(Object.keys(omitted.spec().entries)).toHaveLength(0);
        }
      )
    );
  });

  // Test that range checks maintain valid bounds
  test("should maintain valid bounds for range checks", () => {
    const dateArb = fc.date({
      min: new Date(0),
      max: new Date(2100, 0, 1),
    });

    fc.assert(
      fc.property(validEntryName, dateArb, dateArb, (name, date1, date2) => {
        const min = date1 < date2 ? date1 : date2;
        const max = date1 < date2 ? date2 : date1;

        const builder = PODSpecBuilder.create()
          .entry(name, "date")
          .inRange(name, { min, max });

        const spec = builder.spec();
        const statement = Object.values(spec.statements)[0];

        // Range bounds should be ordered correctly in the spec
        if (statement?.type === "inRange") {
          const minTime = BigInt(statement.inRange.min);
          const maxTime = BigInt(statement.inRange.max);
          expect(minTime).toBeLessThanOrEqual(maxTime);
        }
      })
    );
  });

  // Test that automatic statement names are always unique
  test("should generate unique automatic statement names", () => {
    fc.assert(
      fc.property(entryConfigs, (entries) => {
        const builder = entries.reduce(
          (b, { name }) =>
            b.entry(name, "int").inRange(name, { min: 0n, max: 10n }),
          PODSpecBuilder.create()
        );

        const spec = builder.spec();
        const statementNames = Object.keys(spec.statements);
        const uniqueNames = new Set(statementNames);

        expect(statementNames.length).toBe(uniqueNames.size);
      })
    );
  });

  // Test that custom statement names are always unique
  test("should generate unique custom statement names", () => {
    fc.assert(
      fc.property(entryConfigs, fc.string(), (entries, customName) => {
        const builder = entries.reduce(
          (b, { name }) =>
            b
              .entry(name, "int")
              .inRange(name, { min: 0n, max: 10n }, customName),
          PODSpecBuilder.create()
        );

        const spec = builder.spec();
        const statementNames = Object.keys(spec.statements);
        const uniqueNames = new Set(statementNames);

        expect(statementNames.length).toBe(uniqueNames.size);
      })
    );
  });
});
