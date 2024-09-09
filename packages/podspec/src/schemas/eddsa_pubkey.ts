import { PODEdDSAPublicKeyValue, PODName } from "@pcd/pod";
import { IssueCode, PodspecInvalidTypeIssue } from "../error.js";
import {
  FAILURE,
  ParseResult,
  safeCheckPublicKeyFormat
} from "../parse/parseUtils.js";

/**
 * Schema for an EdDSA public key.
 */
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
    const issue = {
      code: IssueCode.invalid_type,
      expectedType: "eddsa_pubkey",
      path: path
    } satisfies PodspecInvalidTypeIssue;
    return FAILURE([issue]);
  }

  return safeCheckPublicKeyFormat(path, data as PODEdDSAPublicKeyValue);
}

/**
 * Coerces an input to a PODEdDSAPublicKeyValue.
 * Supports the conversion of JavaScript strings to PODEdDSAPublicKeyValue.
 *
 * @param input - The input to coerce.
 * @returns A PODEdDSAPublicKeyValue or undefined if coercion is not possible.
 */
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
