import type {
  PODBooleanValue,
  PODBytesValue,
  PODCryptographicValue,
  PODDateValue,
  PODIntValue,
  PODNullValue,
  PODStringValue
} from "@pcd/pod";

export function validateRange(
  min: bigint | Date,
  max: bigint | Date,
  allowedMin: bigint | Date,
  allowedMax: bigint | Date
) {
  if (min > max) {
    throw new RangeError("Min must be less than or equal to max");
  }
  if (min < allowedMin || max > allowedMax) {
    throw new RangeError("Value out of range");
  }
}

export function toPODStringValue(value: string): PODStringValue {
  return { type: "string", value };
}

export function toPODIntValue(value: bigint): PODIntValue {
  return { type: "int", value };
}

export function toPODBooleanValue(value: boolean): PODBooleanValue {
  return { type: "boolean", value };
}

export function toPODBytesValue(value: Uint8Array): PODBytesValue {
  return { type: "bytes", value };
}

export function toPODCryptographicValue(value: bigint): PODCryptographicValue {
  return { type: "cryptographic", value };
}

export function toPODDateValue(value: Date): PODDateValue {
  return { type: "date", value };
}

export function toPODNullValue(): PODNullValue {
  return { type: "null", value: null };
}
