import type { PODIntValue, PODName } from "@pcd/pod";
import { POD_INT_MAX, POD_INT_MIN } from "@pcd/pod";
import type { PodspecInvalidTypeIssue } from "../error.js";
import { IssueCode } from "../error.js";
import type { ParseResult } from "../parse/parse_utils.js";
import { FAILURE, safeCheckBigintBounds } from "../parse/parse_utils.js";

/**
 * Schema for a PODIntValue.
 */
export interface IntSchema {
  type: "int";
  isMemberOf?: PODIntValue[];
  isNotMemberOf?: PODIntValue[];
  isRevealed?: boolean;
  equalsEntry?: PODName;
  inRange?: { min: bigint; max: bigint };
}

/**
 * Checks if the given input is a valid POD integer.
 *
 * @param data - The input to check
 * @returns A ParseResult wrapping the value
 */
export function checkPODIntValue(
  data: unknown,
  path: string[]
): ParseResult<PODIntValue> {
  if (
    typeof data !== "object" ||
    data === null ||
    !("type" in data && "value" in data) ||
    data.type !== "int" ||
    typeof data.value !== "bigint"
  ) {
    const issue = {
      code: IssueCode.invalid_type,
      expectedType: "int",
      path: path
    } satisfies PodspecInvalidTypeIssue;
    return FAILURE([issue]);
  }

  return safeCheckBigintBounds(
    path,
    data as PODIntValue,
    POD_INT_MIN,
    POD_INT_MAX
  );
}

/**
 * Coerces an input to a PODIntValue.
 * Supports the conversion of JavaScript numbers and bigints to PODIntValue.
 *
 * @param input - The input to coerce.
 * @returns A PODIntValue or undefined if coercion is not possible.
 */
export function intCoercer(input: unknown): PODIntValue | undefined {
  let value: PODIntValue | undefined = undefined;
  if (typeof input === "number") {
    value = {
      type: "int",
      value: BigInt(input)
    };
  } else if (typeof input === "bigint") {
    value = {
      type: "int",
      value: input
    };
  }

  return value;
}
