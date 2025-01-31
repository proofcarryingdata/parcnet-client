import type { PODValue } from "@pcd/pod";
import { toByteArray } from "base64-js";

export function tupleToPODValueTypeValues(
  tuples: string[][],
  types: string[]
): PODValue["value"][][] {
  return tuples.map((tuple) => {
    return tuple.map((value, index) => {
      const type = types[index] as PODValue["type"] | undefined;
      if (type === undefined) {
        throw new Error(`Type for index ${index} is undefined`);
      }
      switch (type) {
        case "string":
        case "eddsa_pubkey":
          return value;
        case "boolean":
          return value === "true" ? true : false;
        case "bytes":
          return toByteArray(value);
        case "cryptographic":
        case "int":
          return BigInt(value);
        case "date":
          return new Date(value);
        case "null":
          return null;
        default:
          const _exhaustiveCheck: never = type;
          return _exhaustiveCheck;
      }
    });
  });
}

export function valueIsEqual(
  a: PODValue["value"],
  b: PODValue["value"]
): boolean {
  if (a instanceof Uint8Array) {
    return (
      b instanceof Uint8Array &&
      a.length === b.length &&
      a.every((value, index) => value === b[index])
    );
  }
  if (a instanceof Date) {
    return b instanceof Date && a.getTime() === b.getTime();
  }
  if (a === null) {
    return b === null;
  }
  if (typeof a === "bigint") {
    return typeof b === "bigint" && a === b;
  }

  // We can just do a simple equality check now
  a satisfies string | boolean;

  return a === b;
}
