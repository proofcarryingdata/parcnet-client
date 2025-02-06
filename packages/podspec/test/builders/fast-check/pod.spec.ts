import { fc, test } from "@fast-check/vitest";
import { POD_NAME_REGEX } from "@pcd/pod";
import { expect } from "vitest";
import type { PODValueType } from "../../../src/builders/types/entries.js";
import { UntypedPODSpecBuilder } from "../../../src/builders/untypedPod.js";

const validEntryName = fc.oneof(
  // Regular valid names
  fc
    .string({ minLength: 1 })
    .filter((s) => POD_NAME_REGEX.test(s)),
  // Tricky JavaScript property names
  fc.constantFrom(
    "constructor",
    "prototype",
    "toString",
    "valueOf",
    "hasOwnProperty",
    "length",
    "name"
  )
);

test("UntypedPODSpecBuilder entries validation", () => {
  // Valid entry types are fixed strings
  const validEntryType = fc.constantFrom(
    "string",
    "int",
    "boolean",
    "date",
    "bytes",
    "cryptographic",
    "null",
    "eddsa_pubkey"
  );

  fc.assert(
    fc.property(
      fc.dictionary(
        validEntryName,
        validEntryType as fc.Arbitrary<PODValueType>
      ),
      (entries) => {
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
      }
    )
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
