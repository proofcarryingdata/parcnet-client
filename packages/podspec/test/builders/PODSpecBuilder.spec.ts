import { describe, it, expect } from "vitest";
import type { EqualsEntry } from "../../src/builders/types/statements.js";
import { PODSpecBuilder } from "../../src/index.js";

describe("PODSpecBuilder", () => {
  it("should be a test", () => {
    expect(true).toBe(true);
  });

  it("PODSpecBuilder", () => {
    const a = PODSpecBuilder.create();
    const b = a.entry("a", "string").entry("b", "int");
    expect(b.spec().entries).toEqual({
      a: "string",
      b: "int",
    });

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
        entry: "b",
        type: "inRange",
        inRange: { min: "10", max: "100" },
      },
    });

    const e = d.isMemberOf(["a", "b"], [["foo", 10n]]);
    expect(e.spec().statements.a_b_isMemberOf.entries).toEqual(["a", "b"]);

    const f = e.pickEntries(["b"]);
    expect(f.spec().statements).toEqual({
      b_inRange: {
        entry: "b",
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
        entry: "a",
        type: "equalsEntry",
        otherEntry: "new",
      },
    });

    expect(g.spec()).toEqual({
      entries: {
        a: "string",
        b: "int",
        new: "string",
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
          entry: "b",
          type: "inRange",
          // Note that the values are strings here, because we convert them to
          // strings when persisting the spec.
          inRange: { min: "10", max: "100" },
        },
        a_new_equalsEntry: {
          entry: "a",
          type: "equalsEntry",
          otherEntry: "new",
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
