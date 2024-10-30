import type { PODNullValue, PODValue } from "@pcd/pod";
import { checkPODValue } from "@pcd/pod/podChecks";
import type { PodspecInvalidTypeIssue } from "../error.js";
import { IssueCode } from "../error.js";
import type { ParseResult } from "../parse/parse_utils.js";
import { FAILURE, SUCCESS } from "../parse/parse_utils.js";

/**
 * Schema for a PODNullValue.
 */
export interface NullSchema {
  type: "null";
}

/**
 * Checks if the given input is a PODNullValue.
 * @param data - The input to check.
 * @returns A ParseResult wrapping the value
 */
export function checkPODNullValue(
  data: unknown,
  path: string[]
): ParseResult<PODNullValue> {
  try {
    checkPODValue("", data as PODValue);
  } catch {
    const issue = {
      code: IssueCode.invalid_type,
      expectedType: "null",
      path: path
    } satisfies PodspecInvalidTypeIssue;
    return FAILURE([issue]);
  }

  return SUCCESS(data as PODNullValue);
}

/**
 * @param input - The input to coerce.
 * @returns A PODNullValue or undefined if coercion is not possible.
 */
export function nullCoercer(input: unknown): PODNullValue | undefined {
  let value: PODNullValue | undefined = undefined;
  if (input === null) {
    value = {
      type: "null",
      value: input
    };
  }

  return value;
}
