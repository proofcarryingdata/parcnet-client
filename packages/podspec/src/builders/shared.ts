import { checkPODValue, type PODValue } from "@pcd/pod";
import type { PODValueType } from "./types/entries.js";
import { fromByteArray } from "base64-js";
import type { SupportsRangeChecks } from "./types/statements.js";

/**
 * Validates a range check.
 *
 * @param min - The minimum value
 * @param max - The maximum value
 * @param allowedMin - The minimum value that is allowed
 * @param allowedMax - The maximum value that is allowed
 * @throws RangeError if the value is out of range
 */
export function validateRange(
  min: bigint | Date,
  max: bigint | Date,
  allowedMin: bigint | Date,
  allowedMax: bigint | Date
): void {
  if (min > max) {
    throw new RangeError("Min must be less than or equal to max");
  }
  if (min < allowedMin || max > allowedMax) {
    throw new RangeError("Value out of range");
  }
}

/**
 * Converts a value to a PODValue.
 *
 * @param nameForError - The name of the value for error messages
 * @param type - The type of the value
 * @param value - The value to convert
 * @throws Error if the value is not a valid PODValue
 * @returns The PODValue
 */
export function toPODValue(
  nameForError: string,
  type: PODValueType,
  value: Extract<PODValue, { type: PODValueType }>["value"]
): Extract<PODValue, { type: PODValueType }> {
  return checkPODValue(nameForError, { value, type } as PODValue);
}

/**
 * Freezes an object to make it immutable.
 *
 * @param obj - The object to freeze.
 * @returns The frozen object.
 */
export function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === "object") {
    // Get all properties, including non-enumerable ones
    const properties = [
      ...Object.getOwnPropertyNames(obj),
      ...Object.getOwnPropertySymbols(obj)
    ];

    properties.forEach((prop) => {
      const value = obj[prop as keyof T];
      if (value && typeof value === "object" && !Object.isFrozen(value)) {
        if (value instanceof Uint8Array) {
          return;
        }
        deepFreeze(value);
      }
    });
  }
  return Object.freeze(obj);
}

function valueToString(value: PODValue["value"]): string {
  if (value === null) {
    return "null";
  }
  if (value instanceof Uint8Array) {
    return fromByteArray(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value.toString();
}

/**
 * Converts POD values to their string representation for storage in a spec.
 * Handles both single-entry and multi-entry cases.
 */
export function convertValuesToStringTuples<N extends string[]>(
  names: [...N],
  values: N["length"] extends 1 ? PODValue["value"][] : PODValue["value"][][],
  entries: Record<N[number], PODValueType>
): { [K in keyof N]: string }[] {
  return names.length === 1
    ? (values as PODValue["value"][]).map((v) => {
        const name = names[0];
        const type = entries[name];
        // TODO Maybe catch and rethrow an error with more context
        checkPODValue(name, { value: v, type } as PODValue);
        return [valueToString(v)] as { [K in keyof N]: string };
      })
    : (values as PODValue["value"][][]).map((tuple, index) => {
        if (tuple.length !== names.length) {
          throw new Error(`Tuple ${index} length does not match names length`);
        }
        return tuple.map((v, i) => {
          const type = entries[names[i]];
          // TODO Maybe catch and rethrow an error with more context
          checkPODValue(names[i], { value: v, type } as PODValue);
          return valueToString(v);
        }) as { [K in keyof N]: string };
      });
}

type DoesNotSupportRangeChecks = Exclude<PODValueType, SupportsRangeChecks>;

export function supportsRangeChecks(
  type: PODValueType
): type is SupportsRangeChecks {
  switch (type) {
    case "int":
    case "boolean":
    case "date":
      return true;
    default:
      // Verify the narrowed type matches DoesNotSupportRangeChecks exactly
      // prettier-ignore
      (type) satisfies DoesNotSupportRangeChecks;
      return false;
  }
}
