import type {
  PODCryptographicValue,
  PODEdDSAPublicKeyValue,
  PODIntValue,
  PODStringValue
} from "@pcd/pod";

// Some terse utility functions for converting native JavaScript values, or
// arrays of values, to their POD equivalents.
// Mostly used to cut down noise in tests, but could be useful in general?

export function $s(value: string): PODStringValue;
export function $s(value: string[]): PODStringValue[];
export function $s(
  value: string | string[]
): PODStringValue | PODStringValue[] {
  if (typeof value === "string") {
    return { type: "string", value };
  } else {
    return value.map((s) => ({ type: "string", value: s }));
  }
}

export function $e(value: string): PODEdDSAPublicKeyValue;
export function $e(value: string[]): PODEdDSAPublicKeyValue[];
export function $e(
  value: string | string[]
): PODEdDSAPublicKeyValue | PODEdDSAPublicKeyValue[] {
  if (typeof value === "string") {
    return { type: "eddsa_pubkey", value };
  } else {
    return value.map((s) => ({ type: "eddsa_pubkey", value: s }));
  }
}

export function $i(value: bigint | number): PODIntValue;
export function $i(value: bigint[] | number[]): PODIntValue[];
export function $i(
  value: bigint | bigint[] | number | number[]
): PODIntValue | PODIntValue[] {
  if (typeof value === "number" || typeof value === "bigint") {
    return { type: "int", value: BigInt(value) };
  } else {
    return value.map((s) => ({ type: "int", value: BigInt(s) }));
  }
}

export function $c(value: bigint | number): PODCryptographicValue;
export function $c(value: bigint[] | number[]): PODCryptographicValue[];
export function $c(
  value: bigint | bigint[] | number | number[]
): PODCryptographicValue | PODCryptographicValue[] {
  if (typeof value === "number" || typeof value === "bigint") {
    return { type: "cryptographic", value: BigInt(value) };
  } else {
    return value.map((s) => ({ type: "cryptographic", value: BigInt(s) }));
  }
}
