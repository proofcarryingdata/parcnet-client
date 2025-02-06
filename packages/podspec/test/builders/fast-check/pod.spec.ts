import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";
import type { PODValueType } from "../../../src/builders/types/entries.js";
import { UntypedPODSpecBuilder } from "../../../src/builders/untypedPod.js";
import { validEntryName, validEntryType } from "./definitions.js";

test("UntypedPODSpecBuilder entries validation", () => {
  fc.assert(
    fc.property(fc.dictionary(validEntryName, validEntryType), (entries) => {
      let builder = UntypedPODSpecBuilder.create();

      // Add all entries
      Object.entries(entries).forEach(([key, type]) => {
        builder = builder.entry(key, type);
      });

      const result = builder.spec();

      // Check that all entries are present with correct types
      Object.entries(entries).forEach(([key, type]) => {
        expect(result.entries[key]).toEqual(type);
      });
    })
  );
});

test("UntypedPODSpecBuilder pick entries", () => {
  fc.assert(
    fc.property(
      fc.dictionary(validEntryName, fc.constant("string" as PODValueType)),
      fc.array(fc.string({ minLength: 1 })),
      (entries, toPick) => {
        let builder = UntypedPODSpecBuilder.create();

        // Add all entries
        Object.entries(entries).forEach(([key, type]) => {
          builder = builder.entry(key, type);
        });

        // Pick only specific entries
        const pickedEntries = toPick
          .filter((key) => Object.prototype.hasOwnProperty.call(entries, key))
          .reduce(
            (acc, key) => {
              acc[key] = entries[key] as string;
              return acc;
            },
            {} as Record<string, string>
          );

        const result = builder.pickEntries(toPick).spec();

        // Check that only picked entries are present
        expect(Object.keys(result.entries)).toEqual(Object.keys(pickedEntries));
        Object.entries(pickedEntries).forEach(([key, type]) => {
          expect(result.entries[key]).toEqual(type);
        });
      }
    )
  );
});

test("UntypedPODSpecBuilder omit entries", () => {
  fc.assert(
    fc.property(
      fc.dictionary(validEntryName, fc.constant("string" as PODValueType)),
      fc.array(fc.string({ minLength: 1 })),
      (entries, toOmit) => {
        let builder = UntypedPODSpecBuilder.create();

        // Add all entries
        Object.entries(entries).forEach(([key, type]) => {
          builder = builder.entry(key, type);
        });

        // Create expected entries after omission
        const expectedEntries = { ...entries };
        toOmit.forEach((key) => {
          delete expectedEntries[key];
        });

        const result = builder.omitEntries(toOmit).spec();

        // Check that omitted entries are not present
        expect(Object.keys(result.entries)).toEqual(
          Object.keys(expectedEntries)
        );
        Object.entries(expectedEntries).forEach(([key, type]) => {
          expect(result.entries[key]).toEqual(type);
        });
      }
    )
  );
});
