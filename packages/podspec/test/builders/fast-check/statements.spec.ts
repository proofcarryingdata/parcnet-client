import { fc, test } from "@fast-check/vitest";
import { describe, expect } from "vitest";
import { UntypedPODSpecBuilder } from "../../../src/builders/untypedPod.js";
import {
  invalidRange,
  validEntryName,
  validIntRange,
  validIntValue,
  validStringValue,
} from "./definitions.js";

describe("Statement Validation", () => {
  // Range Statements
  test("valid inRange statements should be accepted", () => {
    fc.assert(
      fc.property(validEntryName, validIntRange, (name, range) => {
        const builder = UntypedPODSpecBuilder.create().entry(name, "int");
        expect(() => builder.inRange(name, range)).not.toThrow();
      })
    );
  });

  test("invalid inRange statements should be rejected", () => {
    fc.assert(
      fc.property(validEntryName, invalidRange, (name, range) => {
        const builder = UntypedPODSpecBuilder.create().entry(name, "int");

        expect(() => builder.inRange(name, range)).toThrow();
      })
    );
  });

  // Membership Statements
  test("valid isMemberOf statements should be accepted", () => {
    fc.assert(
      fc.property(
        validEntryName,
        fc.array(validStringValue, { minLength: 1 }),
        (name, values) => {
          const builder = UntypedPODSpecBuilder.create().entry(name, "string");

          expect(() => builder.isMemberOf([name], values)).not.toThrow();
        }
      )
    );
  });

  test("valid isMemberOf statements with tuples should be accepted", () => {
    fc.assert(
      fc.property(
        fc.tuple(validEntryName, validEntryName).filter(([a, b]) => a !== b),
        fc.array(fc.tuple(validStringValue, validIntValue), {
          minLength: 1,
          maxLength: 5, // Limit array size
        }),
        ([stringName, intName], tupleValues) => {
          const builder = UntypedPODSpecBuilder.create()
            .entry(stringName, "string")
            .entry(intName, "int");

          expect(() =>
            builder.isMemberOf([stringName, intName], tupleValues)
          ).not.toThrow();
        }
      )
    );
  });

  // Comparison Statements
  test("valid equalsEntry statements should be accepted", () => {
    fc.assert(
      fc.property(
        fc.tuple(validEntryName, validEntryName).filter(([a, b]) => a !== b),
        ([name1, name2]) => {
          const builder = UntypedPODSpecBuilder.create()
            .entry(name1, "string")
            .entry(name2, "string");

          expect(() => builder.equalsEntry(name1, name2)).not.toThrow();
        }
      )
    );
  });

  // ... similar tests for other statement types
});
