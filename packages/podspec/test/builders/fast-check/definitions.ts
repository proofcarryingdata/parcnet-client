import { fc } from "@fast-check/vitest";
import {
  type PODValue,
  POD_INT_MAX,
  POD_INT_MIN,
  POD_NAME_REGEX,
} from "@pcd/pod";

export const validEntryName = fc.oneof(
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

export const validEntryType = fc.constantFrom<PODValue["type"]>(
  "string",
  "int",
  "boolean",
  "date",
  "bytes",
  "cryptographic",
  "null",
  "eddsa_pubkey"
);

const podValidInt = fc.bigInt(POD_INT_MIN, POD_INT_MAX);

// For range statements
export const validIntRange = fc
  .tuple(podValidInt, podValidInt)
  .map(([a, b]) => ({
    min: a < b ? a : b,
    max: a < b ? b : a,
  }));

export const validDateRange = fc.tuple(fc.date(), fc.date()).map(([a, b]) => ({
  min: a <= b ? a : b,
  max: a <= b ? b : a,
}));

// For membership statements
export const validStringValue = fc.string();
export const validIntValue = podValidInt;
export const validBoolValue = fc.boolean();
export const validDateValue = fc.date();
export const validBytesValue = fc.uint8Array();
// etc for other types

// Invalid ranges
export const invalidRange = fc
  .tuple(podValidInt, podValidInt)
  .filter(([a, b]) => a !== b)
  .map(([a, b]) => ({
    min: a > b ? a : b,
    max: a > b ? b : a,
  }));
