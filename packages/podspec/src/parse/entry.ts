import {
  PODCryptographicValue,
  PODIntValue,
  checkBigintBounds
} from "@pcd/pod";
import {
  IssueCode,
  PodspecBaseIssue,
  PodspecNotInRangeIssue
} from "../error.js";
import { DefinedEntrySchema } from "../schemas/entry.js";
import { DEFAULT_ENTRIES_PARSE_OPTIONS } from "./entries.js";
import {
  FAILURE,
  PODValueTypeNameToPODValue,
  ParseResult,
  SUCCESS,
  safeCheckPODValue,
  safeMembershipChecks
} from "./parse_utils.js";

/**
 * Options controlling how parsing of a single entry is performed.
 */
export interface EntryParseOptions {
  exitEarly?: boolean;
  coerce?: boolean;
}

/**
 * Parses a single entry according to a given schema.
 *
 * @param schema The schema for the entry
 * @param input Input values for parsing
 * @param options Options controlling how parsing of entries is performed.
 * @param path The path leading to this object.
 * @param typeValidator A function that validates the type of the input.
 * @param coercer A function that coerces the input to the correct type.
 * @returns A ParseResult containing either a valid result or list of issues.
 */
export function parseEntry<S extends DefinedEntrySchema>(
  schema: S,
  input: unknown,
  options: EntryParseOptions = DEFAULT_ENTRIES_PARSE_OPTIONS,
  path: string[] = [],
  typeValidator: (
    data: unknown,
    path: string[]
  ) => ParseResult<PODValueTypeNameToPODValue[S["type"]]>,
  coercer: (data: unknown) => unknown
): ParseResult<PODValueTypeNameToPODValue[S["type"]]> {
  const issues: PodspecBaseIssue[] = [];

  const checkedType = typeValidator(
    options.coerce ? coercer(input) : input,
    path
  );
  if (!checkedType.isValid) {
    return FAILURE(checkedType.issues);
  }

  const { value } = checkedType;

  const checkedPodValue = safeCheckPODValue(path, value);
  if (!checkedPodValue.isValid) {
    if (options.exitEarly) {
      return FAILURE(checkedPodValue.issues);
    } else {
      issues.push(...checkedPodValue.issues);
    }
  }

  const checkedForMatches = safeMembershipChecks(schema, value, options, path);
  if (!checkedForMatches.isValid) {
    if (options.exitEarly) {
      return FAILURE(checkedForMatches.issues);
    } else {
      issues.push(...checkedForMatches.issues);
    }
  }

  if (schema.type === "cryptographic" || schema.type === "int") {
    if (schema.inRange) {
      const { min, max } = schema.inRange;
      const valueToCheck = (value as PODIntValue | PODCryptographicValue).value;
      try {
        checkBigintBounds("", valueToCheck, min, max);
      } catch (_error) {
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
