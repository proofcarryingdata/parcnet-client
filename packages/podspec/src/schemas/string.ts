import { PODName, PODStringValue } from "@pcd/pod";
import { IssueCode, PodspecInvalidTypeIssue } from "../error";
import { FAILURE, ParseResult, SUCCESS } from "../parse/parseUtils";

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
    return FAILURE([
      {
        code: IssueCode.invalid_type,
        expectedType: "string",
        path: path
      } satisfies PodspecInvalidTypeIssue
    ]);
  }

  return SUCCESS(data as PODStringValue);
}

export function stringCoercer(input: unknown): unknown {
  if (typeof input === "string") {
    return {
      type: "string",
      value: input
    };
  } else {
    return input;
  }
}
