import type {
  PODBooleanValue,
  PODBytesValue,
  PODCryptographicValue,
  PODDateValue,
  PODEdDSAPublicKeyValue,
  PODIntValue,
  PODNullValue,
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

export function $b(value: boolean): PODBooleanValue;
export function $b(value: boolean[]): PODBooleanValue[];
export function $b(
  value: boolean | boolean[]
): PODBooleanValue | PODBooleanValue[] {
  if (typeof value === "boolean") {
    return { type: "boolean", value };
  } else {
    return value.map((b) => ({ type: "boolean", value: b }));
  }
}

export function $n(value: null): PODNullValue;
export function $n(value: null[]): PODNullValue[];
export function $n(value: null | null[]): PODNullValue | PODNullValue[] {
  if (value === null) {
    return { type: "null", value: null };
  } else {
    return value.map(() => ({ type: "null", value: null }));
  }
}

export function $d(value: Date): PODDateValue;
export function $d(value: Date[]): PODDateValue[];
export function $d(value: Date | Date[]): PODDateValue | PODDateValue[] {
  if (value instanceof Date) {
    return { type: "date", value };
  } else {
    return value.map((d) => ({ type: "date", value: d }));
  }
}

export function $bs(value: Uint8Array): PODBytesValue;
export function $bs(value: Uint8Array[]): PODBytesValue[];
export function $bs(
  value: Uint8Array | Uint8Array[]
): PODBytesValue | PODBytesValue[] {
  if (value instanceof Uint8Array) {
    return { type: "bytes", value };
  } else {
    return value.map((b) => ({ type: "bytes", value: b }));
  }
}
