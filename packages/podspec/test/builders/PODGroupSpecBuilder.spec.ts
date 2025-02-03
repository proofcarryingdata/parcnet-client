import { fc, test } from "@fast-check/vitest";
import { assertType, describe, expect, it } from "vitest";
import type { AllPODEntries } from "../../src/builders/group.js";
import type {
  EntryName,
  PODValueType,
} from "../../src/builders/types/entries.js";
import type {
  EntriesWithRangeChecks,
  Statements,
} from "../../src/builders/types/statements.js";
import { PODGroupSpecBuilder, PODSpecBuilder } from "../../src/index.js";

describe("PODGroupSpecBuilder", () => {
  it("should be a test", () => {
    expect(true).toBe(true);
  });

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
    });

    expect(groupWithPod.spec()).toEqual({
      pods: {
        foo: podBuilder.spec(),
      },
      statements: {},
    });

    const groupWithPodAndStatement = groupWithPod.isMemberOf(
      ["foo.my_string"],
      ["hello"]
    );
    const spec3 = groupWithPodAndStatement.spec();

    expect(spec3).toEqual({
      pods: {
        foo: podBuilder.spec(),
      },
      statements: {
        "foo.my_string_isMemberOf": {
          entries: ["foo.my_string"],
          isMemberOf: [["hello"]],
          type: "isMemberOf",
        },
      },
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
      "foo.$signerPublicKey": "eddsa_pubkey",
    });

    groupWithPod.equalsEntry("foo.my_num", "foo.my_other_num");

    // Now let's try to see what happens in equalsEntry
    type _T1 = Parameters<typeof groupWithPod.equalsEntry>[0]; // First parameter type
    type _T2 = Parameters<typeof groupWithPod.equalsEntry>[1]; // Second parameter type
  });
});

describe("PODGroupSpecBuilder - Property tests", () => {
  // Arbitraries for generating test data
  const validPodName = fc
    .string()
    .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s))
    .filter((s) => s.length <= 32);

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
  ) as fc.Arbitrary<PODValueType>;

  const entryConfig = fc.record({
    name: validEntryName,
    type: podType,
  });

  const podConfig = fc.record({
    name: validPodName,
    entries: fc.uniqueArray(entryConfig, {
      minLength: 1,
      maxLength: 5,
      comparator: (a, b) => a.name === b.name,
    }),
  });

  const podConfigs = fc.uniqueArray(podConfig, {
    minLength: 1,
    maxLength: 3,
    comparator: (a, b) => a.name === b.name,
  });

  // Helper function to create a POD spec from entries
  const createPodSpec = (entries: { name: string; type: PODValueType }[]) => {
    return entries.reduce(
      (builder, { name, type }) => builder.entry(name, type),
      PODSpecBuilder.create()
    );
  };

  // Test that adding PODs is commutative
  test("should be commutative when adding PODs", () => {
    fc.assert(
      fc.property(podConfigs, (pods) => {
        // Add PODs in original order
        const builder1 = pods.reduce(
          (builder, { name, entries }) =>
            builder.pod(name, createPodSpec(entries).spec()),
          PODGroupSpecBuilder.create()
        );

        // Add PODs in reverse order
        const builder2 = [...pods]
          .reverse()
          .reduce(
            (builder, { name, entries }) =>
              builder.pod(name, createPodSpec(entries).spec()),
            PODGroupSpecBuilder.create()
          );

        // The resulting specs should be equivalent
        expect(builder1.spec()).toEqual(builder2.spec());
      })
    );
  });

  // Test that range checks maintain valid bounds across PODs
  test("should maintain valid bounds for range checks across PODs", () => {
    const dateArb = fc.date({
      min: new Date(0),
      max: new Date(2100, 0, 1),
    });

    fc.assert(
      fc.property(
        podConfigs,
        validPodName,
        validEntryName,
        dateArb,
        dateArb,
        (pods, podName, entryName, date1, date2) => {
          // Create a POD with a date entry
          const podWithDate = {
            name: podName,
            entries: [{ name: entryName, type: "date" as const }],
          };

          const min = date1 < date2 ? date1 : date2;
          const max = date1 < date2 ? date2 : date1;

          const builder = pods
            .reduce(
              (builder, { name, entries }) =>
                builder.pod(name, createPodSpec(entries).spec()),
              PODGroupSpecBuilder.create()
            )
            .pod(podWithDate.name, createPodSpec(podWithDate.entries).spec())
            .inRange(`${podWithDate.name}.${entryName}`, { min, max });

          const spec = builder.spec();
          const statement = Object.values(spec.statements)[0] as Statements;

          // Range bounds should be ordered correctly in the spec
          if (statement?.type === "inRange") {
            const minTime = BigInt(statement.inRange.min);
            const maxTime = BigInt(statement.inRange.max);
            expect(minTime).toBeLessThanOrEqual(maxTime);
          }
        }
      )
    );
  });

  // Test that automatic statement names are always unique
  test("should generate unique automatic statement names", () => {
    fc.assert(
      fc.property(podConfigs, (pods) => {
        const builder = pods.reduce((b, { name, entries }) => {
          return b.pod(name, createPodSpec(entries).spec());
        }, PODGroupSpecBuilder.create());

        // Add some statements using the first entry of each POD
        const builderWithStatements = pods.reduce((b, { name, entries }) => {
          if (entries[0] && entries[0].type === "int") {
            return b.inRange(`${name}.${entries[0].name}`, {
              min: 0n,
              max: 10n,
            });
          }
          return b;
        }, builder);

        const spec = builderWithStatements.spec();
        const statementNames = Object.keys(spec.statements);
        const uniqueNames = new Set(statementNames);

        expect(statementNames.length).toBe(uniqueNames.size);
      })
    );
  });

  // Test that entry equality checks work across PODs
  test("should maintain type safety for equalsEntry across PODs", () => {
    fc.assert(
      fc.property(podConfigs, (pods) => {
        // Find two PODs with matching entry types
        const podsWithMatchingEntries = pods.filter(
          (pod) => pod.entries[0]?.type === pods[0]?.entries[0]?.type
        );

        if (podsWithMatchingEntries.length >= 2) {
          const pod1 = podsWithMatchingEntries[0];
          const pod2 = podsWithMatchingEntries[1];

          const builder = pods.reduce(
            (builder, { name, entries }) =>
              builder.pod(name, createPodSpec(entries).spec()),
            PODGroupSpecBuilder.create()
          );

          if (pod1 && pod2 && pod1.entries[0] && pod2.entries[0]) {
            const builderWithEquals = builder.equalsEntry(
              `${pod1.name}.${pod1.entries[0].name}`,
              `${pod2.name}.${pod2.entries[0].name}`
            );

            const spec = builderWithEquals.spec();
            const statement = Object.values(spec.statements)[0] as Statements;

            expect(statement?.type).toBe("equalsEntry");
            expect(statement?.entries).toHaveLength(2);
          }
        }
      })
    );
  });
});

// Let's start with an empty PODGroupSpecBuilder
type EmptyPODs = {};

// Check AllPODEntries
type Step1 = AllPODEntries<EmptyPODs>;

// Check EntriesWithRangeChecks
type Step2 = EntriesWithRangeChecks<Step1>;

// Check EntryName
type Step3 = EntryName<Step2>;

// Check the full constraint
type Step4 = EntryName<EntriesWithRangeChecks<AllPODEntries<EmptyPODs>>>;

type Debug1 = AllPODEntries<{}>;
type Debug2 = EntriesWithRangeChecks<Debug1>;
type Debug3 = EntryName<Debug2>;

// The conditional type from range:
type Step5<N> = N extends keyof EntriesWithRangeChecks<AllPODEntries<EmptyPODs>>
  ? AllPODEntries<EmptyPODs>[N] extends "date"
    ? Date
    : bigint
  : Date | bigint;
