import {
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN,
  PODCryptographicValue,
  PODName
} from "@pcd/pod";
import { IssueCode, PodspecInvalidTypeIssue } from "../error";
import {
  FAILURE,
  ParseResult,
  safeCheckBigintBounds
} from "../parse/parseUtils";

export interface CryptographicSchema {
  type: "cryptographic";
  isMemberOf?: PODCryptographicValue[];
  isNotMemberOf?: PODCryptographicValue[];
  isRevealed?: boolean;
  equalsEntry?: PODName;
  inRange?: { min: bigint; max: bigint };
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
    return FAILURE([
      {
        code: IssueCode.invalid_type,
        expectedType: "cryptographic",
        path: path
      } satisfies PodspecInvalidTypeIssue
    ]);
  }

  return safeCheckBigintBounds(
    path,
    data as PODCryptographicValue,
    POD_CRYPTOGRAPHIC_MIN,
    POD_CRYPTOGRAPHIC_MAX
  );
}

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
