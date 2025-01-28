import { checkPODValue, type PODValue } from "@pcd/pod";
import type { PODValueType } from "../types/utils.js";

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
        deepFreeze(value);
      }
    });
  }
  return Object.freeze(obj);
}
