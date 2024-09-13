import { PODName, PODStringValue } from "@pcd/pod";
import { IssueCode, PodspecInvalidTypeIssue } from "../error.js";
import { FAILURE, ParseResult, SUCCESS } from "../parse/parse_utils.js";

/**
 * Schema for a PODStringValue.
 */
export interface StringSchema {
  type: "string";
  isMemberOf?: PODStringValue[];
  isNotMemberOf?: PODStringValue[];
  isRevealed?: boolean;
  equalsEntry?: PODName;
}

/**
 * Checks if the given input is a PODEdDSAPublicKeyValue.
 * @param data - The input to check.
 * @returns A ParseResult wrapping the value
 */
export function checkPODStringValue(
  data: unknown,
  path: string[]
): ParseResult<PODStringValue> {
  if (
    typeof data !== "object" ||
    data === null ||
    !("type" in data && "value" in data) ||
    data.type !== "string" ||
    typeof data.value !== "string"
  ) {
    const issue = {
      code: IssueCode.invalid_type,
      expectedType: "string",
      path: path
    } satisfies PodspecInvalidTypeIssue;
    return FAILURE([issue]);
  }

  return SUCCESS(data as PODStringValue);
}

/**
 * @param input - The input to coerce.
 * @returns A PODStringValue or undefined if coercion is not possible.
 */
export function stringCoercer(input: unknown): PODStringValue | undefined {
  let value: PODStringValue | undefined = undefined;
  if (typeof input === "string") {
    value = {
      type: "string",
      value: input
    };
  }

  return value;
}
