import type { PODCryptographicValue, PODName } from "@pcd/pod";
import {
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN
} from "@pcd/pod/podTypes";
import type { PodspecInvalidTypeIssue } from "../error.js";
import { IssueCode } from "../error.js";
import type { ParseResult } from "../parse/parse_utils.js";
import { FAILURE, safeCheckBigintBounds } from "../parse/parse_utils.js";

/**
 * Schema for a cryptographic value.
 */
export interface CryptographicSchema {
  type: "cryptographic";
  isMemberOf?: PODCryptographicValue[];
  isNotMemberOf?: PODCryptographicValue[];
  equalsEntry?: PODName;
  inRange?: { min: bigint; max: bigint };
  // isOwnerID is supported for cryptographic values, e.g. a Semaphore commitment
  isOwnerID?: boolean;
}

/**
 * Checks if the given input is a PODCryptographicValue.
 *
 * @param data - The input to check.
 * @returns A ParseResult wrapping the value
 */
export function checkPODCryptographicValue(
  data: unknown,
  path: string[]
): ParseResult<PODCryptographicValue> {
  if (
    typeof data !== "object" ||
    data === null ||
    !("type" in data && "value" in data) ||
    data.type !== "cryptographic" ||
    typeof data.value !== "bigint"
  ) {
    const issue = {
      code: IssueCode.invalid_type,
      expectedType: "cryptographic",
      path: path
    } satisfies PodspecInvalidTypeIssue;
    return FAILURE([issue]);
  }

  return safeCheckBigintBounds(
    path,
    data as PODCryptographicValue,
    POD_CRYPTOGRAPHIC_MIN,
    POD_CRYPTOGRAPHIC_MAX
  );
}

/**
 * Coerces an input to a PODCryptographicValue.
 * Supports the conversion of JavaScript numbers and bigints to PODCryptographicValue.
 *
 * @param input - The input to coerce.
 * @returns A PODCryptographicValue or undefined if coercion is not possible.
 */
export function cryptographicCoercer(
  input: unknown
): PODCryptographicValue | undefined {
  let value: PODCryptographicValue | undefined = undefined;
  if (typeof input === "number") {
    value = {
      type: "cryptographic",
      value: BigInt(input)
    };
  } else if (typeof input === "bigint") {
    value = {
      type: "cryptographic",
      value: input
    };
  }

  return value;
}
