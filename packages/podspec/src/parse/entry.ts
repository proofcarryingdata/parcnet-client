import {
  checkBigintBounds,
  PODCryptographicValue,
  PODIntValue
} from "@pcd/pod";
import { IssueCode, PodspecIssue, PodspecNotInRangeIssue } from "../error";
import { CryptographicSchema } from "../schemas/cryptographic";
import { EdDSAPublicKeySchema } from "../schemas/eddsa_pubkey";
import { IntSchema } from "../schemas/int";
import { StringSchema } from "../schemas/string";
import { DEFAULT_ENTRIES_PARSE_OPTIONS } from "./entries";
import {
  FAILURE,
  ParseResult,
  PODValueTypeToPODValue,
  safeCheckPODValue,
  safeMembershipChecks,
  SUCCESS
} from "./parseUtils";

export interface OptionalSchema {
  type: "optional";
  innerType:
    | StringSchema
    | CryptographicSchema
    | IntSchema
    | EdDSAPublicKeySchema;
}

export type DefinedEntrySchema =
  | StringSchema
  | CryptographicSchema
  | IntSchema
  | EdDSAPublicKeySchema;

export type EntrySchema = DefinedEntrySchema | OptionalSchema;

export interface EntryParseOptions {
  exitEarly?: boolean;
  coerce?: boolean;
}

export function parseEntry<S extends DefinedEntrySchema>(
  schema: S,
  input: unknown,
  options: EntryParseOptions = DEFAULT_ENTRIES_PARSE_OPTIONS,
  path: string[] = [],
  typeValidator: (
    data: unknown,
    path: string[]
  ) => ParseResult<PODValueTypeToPODValue[S["type"]]>,
  coercer: (data: unknown) => unknown
): ParseResult<PODValueTypeToPODValue[S["type"]]> {
  const issues: PodspecIssue[] = [];

  const checkedType = typeValidator(
    options.coerce ? coercer(input) : input,
    path
  );
  if (!checkedType.isValid) {
    return FAILURE(checkedType.errors);
  }

  const { value } = checkedType;

  const checkedPodValue = safeCheckPODValue(path, value);
  if (!checkedPodValue.isValid) {
    if (options.exitEarly) {
      return FAILURE(checkedPodValue.errors);
    } else {
      issues.push(...checkedPodValue.errors);
    }
  }

  const checkedForMatches = safeMembershipChecks(schema, value, options, path);
  if (!checkedForMatches.isValid) {
    if (options.exitEarly) {
      return FAILURE(checkedForMatches.errors);
    } else {
      issues.push(...checkedForMatches.errors);
    }
  }

  if (schema.type === "cryptographic" || schema.type === "int") {
    if (schema.inRange) {
      const { min, max } = schema.inRange;
      const valueToCheck = (value as PODIntValue | PODCryptographicValue).value;
      try {
        checkBigintBounds("", valueToCheck, min, max);
      } catch (error) {
        const issue: PodspecNotInRangeIssue = {
          code: IssueCode.not_in_range,
          value: valueToCheck,
          min,
          max,
          path
        };
        if (options.exitEarly) {
          return FAILURE([issue]);
        } else {
          issues.push(issue);
        }
      }
    }
  }

  return issues.length > 0 ? FAILURE(issues) : SUCCESS(value);
}
