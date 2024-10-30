import type { PODBooleanValue, PODValue } from "@pcd/pod";
import { checkPODValue } from "@pcd/pod/podChecks";
import type { PodspecInvalidTypeIssue } from "../error.js";
import { IssueCode } from "../error.js";
import type { ParseResult } from "../parse/parse_utils.js";
import { FAILURE, SUCCESS } from "../parse/parse_utils.js";

/**
 * Schema for a PODBooleanValue.
 */
export interface BooleanSchema {
  type: "boolean";
  isMemberOf?: PODBooleanValue[];
  isNotMemberOf?: PODBooleanValue[];
}

/**
 * Checks if the given input is a PODBytesValue.
 * @param data - The input to check.
 * @returns A ParseResult wrapping the value
 */
export function checkPODBooleanValue(
  data: unknown,
  path: string[]
): ParseResult<PODBooleanValue> {
  try {
    checkPODValue("", data as PODValue);
  } catch {
    const issue = {
      code: IssueCode.invalid_type,
      expectedType: "boolean",
      path: path
    } satisfies PodspecInvalidTypeIssue;
    return FAILURE([issue]);
  }

  return SUCCESS(data as PODBooleanValue);
}

/**
 * @param input - The input to coerce.
 * @returns A PODBytesValue or undefined if coercion is not possible.
 */
export function booleanCoercer(input: unknown): PODBooleanValue | undefined {
  let value: PODBooleanValue | undefined = undefined;
  if (typeof input === "boolean") {
    value = {
      type: "boolean",
      value: input
    };
  }

  return value;
}
