import {
  PODCryptographicValue,
  PODEdDSAPublicKeyValue,
  PODIntValue,
  PODStringValue,
  PODValue,
  checkBigintBounds,
  checkPODValue,
  checkPublicKeyFormat
} from "@pcd/pod";
import {
  IssueCode,
  PodspecBaseIssue,
  PodspecExcludedByListIssue,
  PodspecExcludedByTupleListIssue,
  PodspecInvalidPodValueIssue,
  PodspecInvalidTupleEntryIssue,
  PodspecNotInListIssue,
  PodspecNotInTupleListIssue
} from "../error.js";
import { EntriesSchema } from "../schemas/entries.js";
import { DefinedEntrySchema } from "../schemas/entry.js";
import { PODTupleSchema } from "../schemas/pod.js";
import { EntriesParseOptions } from "./entries.js";
import { EntryParseOptions } from "./entry.js";

type ParseSuccess<T> = {
  value: T;
  isValid: true;
};

type ParseFailure = {
  issues: PodspecBaseIssue[];
  isValid: false;
};

/**
 * A ParseResult is a container for either a valid value or a list of issues.
 */
export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

/**
 * Creates a ParseFailure containing a list of issues.
 *
 * @param errors The issues to include in the failure.
 * @returns A ParseFailure containing the issues.
 */
export function FAILURE(errors: PodspecBaseIssue[]): ParseFailure {
  return { isValid: false, issues: errors ?? [] };
}

/**
 * Creates a ParseSuccess containing a valid value.
 *
 * @param value The value to include in the success.
 * @returns A ParseSuccess containing the value.
 */
export function SUCCESS<T>(value: T): ParseSuccess<T> {
  return {
    isValid: true,
    value
  };
}

/**
 * Wraps {@link checkPODValue} in a ParseResult, rather than throwing an exception.
 *
 * @param path The path leading to this value.
 * @param podValue The value to check.
 * @returns A ParseResult containing either a valid result or list of issues.
 */
export function safeCheckPODValue(
  path: string[],
  podValue: PODValue
): ParseResult<PODValue> {
  try {
    checkPODValue(path.join("."), podValue);
  } catch (error) {
    const issue: PodspecInvalidPodValueIssue = {
      code: IssueCode.invalid_pod_value,
      value: podValue,
      reason: (error as Error).message,
      path
    };
    return FAILURE([issue]);
  }

  return SUCCESS(podValue);
}

/**
 * Wraps {@link checkBigintBounds} in a ParseResult, rather than throwing an exception.
 *
 * @param path The path leading to this value.
 * @param podValue The value to check.
 * @param min The minimum value for the range.
 * @param max The maximum value for the range.
 * @returns A ParseResult containing either a valid result or list of issues.
 */
export function safeCheckBigintBounds<
  T extends PODCryptographicValue | PODIntValue
>(path: string[], podValue: T, min: bigint, max: bigint): ParseResult<T> {
  try {
    const value = podValue.value;
    checkBigintBounds(path.join("."), value, min, max);
  } catch (error) {
    const issue: PodspecInvalidPodValueIssue = {
      code: IssueCode.invalid_pod_value,
      value: podValue,
      reason: (error as Error).message,
      path
    };
    return FAILURE([issue]);
  }

  return SUCCESS(podValue);
}

/**
 * Wraps {@link checkPublicKeyFormat} in a ParseResult, rather than throwing an exception.
 *
 * @param path The path leading to this value.
 * @param podValue The value to check.
 * @returns A ParseResult containing either a valid result or list of issues.
 */
export function safeCheckPublicKeyFormat(
  path: string[],
  podValue: PODEdDSAPublicKeyValue
): ParseResult<PODEdDSAPublicKeyValue> {
  try {
    checkPublicKeyFormat(podValue.value, path.join("."));
  } catch (error) {
    const issue: PodspecInvalidPodValueIssue = {
      code: IssueCode.invalid_pod_value,
      value: podValue,
      reason: (error as Error).message,
      path
    };
    return FAILURE([issue]);
  }

  return SUCCESS(podValue);
}

/**
 * Checks if two PODValues are equal.
 *
 * @param a The first value to compare.
 * @param b The second value to compare.
 * @returns True if the values are equal, false otherwise.
 */
export function isEqualPODValue(a: PODValue, b: PODValue): boolean {
  return a.type === b.type && a.value === b.value;
}

/**
 * Checks if a PODValue is a member of a list of PODValues.
 *
 * @param schema The schema to check against.
 * @param value The value to check.
 * @param options The parse options.
 * @param path The path leading to this value.
 * @returns A ParseResult containing either a valid result or list of issues.
 */
export function safeMembershipChecks<
  S extends DefinedEntrySchema,
  T extends PODValue
>(
  schema: S,
  value: T,
  options: EntryParseOptions,
  path: string[]
): ParseResult<T> {
  const issues: PodspecBaseIssue[] = [];
  const isMatchingValue = (otherValue: PODValue): boolean =>
    isEqualPODValue(value, otherValue);

  if (schema.isMemberOf && !schema.isMemberOf.find(isMatchingValue)) {
    const issue: PodspecNotInListIssue = {
      code: IssueCode.not_in_list,
      value: value,
      list: schema.isMemberOf,
      path
    };
    if (options.exitEarly) {
      return FAILURE([issue]);
    } else {
      issues.push(issue);
    }
  }

  if (
    schema.isNotMemberOf &&
    schema.isNotMemberOf.length > 0 &&
    schema.isNotMemberOf.find(isMatchingValue)
  ) {
    const issue: PodspecExcludedByListIssue = {
      code: IssueCode.excluded_by_list,
      value: value,
      list: schema.isNotMemberOf,
      path
    };
    if (options.exitEarly) {
      return FAILURE([issue]);
    } else {
      issues.push(issue);
    }
  }

  return issues.length > 0 ? FAILURE(issues) : SUCCESS(value);
}

/**
 * Checks if the tuples specified for a set of entries match the values of
 * the entries provided.
 *
 * @param output The output to check.
 * @param tupleSchema The schema to check against.
 * @param options The parse options.
 * @param path The path leading to this value.
 * @returns A ParseResult containing either a valid result or list of issues.
 */
export function safeCheckTuple<E extends EntriesSchema>(
  output: Record<string, PODValue>,
  tupleSchema: PODTupleSchema<E>,
  options: EntriesParseOptions<E>,
  path: string[]
): ParseResult<Record<string, PODValue>> {
  const issues: PodspecBaseIssue[] = [];
  const outputKeys = Object.keys(output);
  const tuple: PODValue[] = [];
  let validTuple = true;

  for (const k of tupleSchema.entries) {
    const entryKey = k.toString();
    if (!outputKeys.includes(entryKey)) {
      const issue: PodspecInvalidTupleEntryIssue = {
        code: IssueCode.invalid_tuple_entry,
        name: entryKey,
        path: [...path, entryKey]
      };
      if (options.exitEarly) {
        return FAILURE([issue]);
      } else {
        issues.push(issue);
      }
      validTuple = false;
    }
    tuple.push(output[entryKey]!);
  }

  if (validTuple) {
    if (tupleSchema.isMemberOf) {
      const matched = tupleSchema.isMemberOf.some((tupleToCheck) =>
        tupleToCheck.every((val, index) => isEqualPODValue(val, tuple[index]!))
      );
      if (!matched) {
        const issue: PodspecNotInTupleListIssue = {
          code: IssueCode.not_in_tuple_list,
          value: tuple,
          list: tupleSchema.isMemberOf,
          path
        };
        if (options.exitEarly) {
          return FAILURE([issue]);
        } else {
          issues.push(issue);
        }
      }
    }

    if (tupleSchema.isNotMemberOf && tupleSchema.isNotMemberOf.length > 0) {
      const matched = tupleSchema.isNotMemberOf.some((tupleToCheck) =>
        tupleToCheck.every((val, index) => isEqualPODValue(val, tuple[index]!))
      );

      if (matched) {
        const issue: PodspecExcludedByTupleListIssue = {
          code: IssueCode.excluded_by_tuple_list,
          value: tuple,
          list: tupleSchema.isNotMemberOf,
          path: [...path]
        };
        if (options.exitEarly) {
          return FAILURE([issue]);
        } else {
          issues.push(issue);
        }
      }
    }
  }

  return issues.length > 0 ? FAILURE(issues) : SUCCESS(output);
}

/**
 * Mapping of PODValue types to their TypeScript native equivalents.
 */
export type PODValueNativeTypes = {
  string: string;
  int: bigint;
  cryptographic: bigint;
  eddsa_pubkey: string;
};

/**
 * Mapping of PODValue type names to their PODValue data types.
 */
export type PODValueTypeNameToPODValue = {
  string: PODStringValue;
  int: PODIntValue;
  cryptographic: PODCryptographicValue;
  eddsa_pubkey: PODEdDSAPublicKeyValue;
};
