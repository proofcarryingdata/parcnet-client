import { PODEdDSAPublicKeyValue, PODName } from "@pcd/pod";
import { IssueCode, PodspecInvalidTypeIssue } from "../error";
import {
  FAILURE,
  ParseResult,
  safeCheckPublicKeyFormat
} from "../parse/parseUtils";

export interface EdDSAPublicKeySchema {
  type: "eddsa_pubkey";
  isMemberOf?: PODEdDSAPublicKeyValue[];
  isNotMemberOf?: PODEdDSAPublicKeyValue[];
  isRevealed?: boolean;
  equalsEntry?: PODName;
}

/**
 * Checks if the given input is a PODEdDSAPublicKeyValue.
 * @param data - The input to check.
 * @returns A ParseResult wrapping the value
 */
export function checkPODEdDSAPublicKeyValue(
  data: unknown,
  path: string[]
): ParseResult<PODEdDSAPublicKeyValue> {
  if (
    typeof data !== "object" ||
    data === null ||
    !("type" in data && "value" in data) ||
    data.type !== "eddsa_pubkey" ||
    typeof data.value !== "string"
  ) {
    return FAILURE([
      {
        code: IssueCode.invalid_type,
        expectedType: "eddsa_pubkey",
        path: path
      } satisfies PodspecInvalidTypeIssue
    ]);
  }

  return safeCheckPublicKeyFormat(path, data as PODEdDSAPublicKeyValue);
}

export function eddsaPublicKeyCoercer(
  input: unknown
): PODEdDSAPublicKeyValue | undefined {
  let value: PODEdDSAPublicKeyValue | undefined = undefined;
  if (typeof input === "string") {
    value = {
      type: "eddsa_pubkey",
      value: input
    };
  }

  return value;
}
