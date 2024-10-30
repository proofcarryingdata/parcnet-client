import type { PODBytesValue, PODName, PODValue } from "@pcd/pod";
import { checkPODValue } from "@pcd/pod/podChecks";
import type { PodspecInvalidTypeIssue } from "../error.js";
import { IssueCode } from "../error.js";
import type { ParseResult } from "../parse/parse_utils.js";
import { FAILURE, SUCCESS } from "../parse/parse_utils.js";

/**
 * Schema for a PODBytesValue.
 */
export interface BytesSchema {
  type: "bytes";
  isMemberOf?: PODBytesValue[];
  isNotMemberOf?: PODBytesValue[];
  equalsEntry?: PODName;
}

/**
 * Checks if the given input is a PODBytesValue.
 * @param data - The input to check.
 * @returns A ParseResult wrapping the value
 */
export function checkPODBytesValue(
  data: unknown,
  path: string[]
): ParseResult<PODBytesValue> {
  try {
    checkPODValue("", data as PODValue);
  } catch {
    const issue = {
      code: IssueCode.invalid_type,
      expectedType: "bytes",
      path: path
    } satisfies PodspecInvalidTypeIssue;
    return FAILURE([issue]);
  }

  return SUCCESS(data as PODBytesValue);
}

/**
 * @param input - The input to coerce.
 * @returns A PODBytesValue or undefined if coercion is not possible.
 */
export function bytesCoercer(input: unknown): PODBytesValue | undefined {
  let value: PODBytesValue | undefined = undefined;
  if (input instanceof Uint8Array) {
    value = {
      type: "bytes",
      value: input
    };
  }

  return value;
}
