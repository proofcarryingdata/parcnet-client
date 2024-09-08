import {
  checkBigintBounds,
  PODCryptographicValue,
  PODIntValue
} from "@pcd/pod";
import { IssueCode, PodspecIssue, PodspecNotInRangeIssue } from "../error.js";
import { DefinedEntrySchema } from "../schemas/entry.js";
import { DEFAULT_ENTRIES_PARSE_OPTIONS } from "./entries.js";
import {
  FAILURE,
  ParseResult,
  PODValueTypeToPODValue,
  safeCheckPODValue,
  safeMembershipChecks,
  SUCCESS
} from "./parseUtils.js";

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
