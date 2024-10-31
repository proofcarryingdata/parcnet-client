import type { PODDateValue, PODValue } from "@pcd/pod";
import { checkPODValue } from "@pcd/pod/podChecks";
import type { PodspecInvalidTypeIssue } from "../error.js";
import { IssueCode } from "../error.js";
import type { ParseResult } from "../parse/parse_utils.js";
import { FAILURE, SUCCESS } from "../parse/parse_utils.js";

/**
 * Schema for a PODDateValue.
 */
export interface DateSchema {
  type: "date";
  isMemberOf?: PODDateValue[];
  isNotMemberOf?: PODDateValue[];
  inRange?: { min: bigint; max: bigint };
}

/**
 * Checks if the given input is a PODBytesValue.
 * @param data - The input to check.
 * @returns A ParseResult wrapping the value
 */
export function checkPODDateValue(
  data: unknown,
  path: string[]
): ParseResult<PODDateValue> {
  try {
    checkPODValue("", data as PODValue);
  } catch {
    const issue = {
      code: IssueCode.invalid_type,
      expectedType: "date",
      path: path
    } satisfies PodspecInvalidTypeIssue;
    return FAILURE([issue]);
  }

  return SUCCESS(data as PODDateValue);
}

/**
 * @param input - The input to coerce.
 * @returns A PODDateValue or undefined if coercion is not possible.
 */
export function dateCoercer(input: unknown): PODDateValue | undefined {
  let value: PODDateValue | undefined = undefined;
  if (input instanceof Date) {
    value = {
      type: "date",
      value: input
    };
  }

  return value;
}
