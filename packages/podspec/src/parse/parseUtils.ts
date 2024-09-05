import {
  checkBigintBounds,
  checkPODValue,
  checkPublicKeyFormat,
  PODCryptographicValue,
  PODEdDSAPublicKeyValue,
  PODIntValue,
  PODStringValue,
  PODValue
} from "@pcd/pod";
import {
  IssueCode,
  PodspecExcludedByListIssue,
  PodspecExcludedByTupleListIssue,
  PodspecInvalidPodValueIssue,
  PodspecInvalidTupleEntryIssue,
  PodspecIssue,
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
  issues: PodspecIssue[];
  isValid: false;
};

export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

export function FAILURE(errors: PodspecIssue[]): ParseFailure {
  return { isValid: false, issues: errors ?? [] };
}

export function SUCCESS<T>(value: T): ParseSuccess<T> {
  return {
    isValid: true,
    value
  };
}

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

export function isEqualPODValue(a: PODValue, b: PODValue): boolean {
  return a.type === b.type && a.value === b.value;
}

export function safeMembershipChecks<
  S extends DefinedEntrySchema,
  T extends PODValue
>(
  schema: S,
  value: T,
  options: EntryParseOptions,
  path: string[]
): ParseResult<T> {
  const issues: PodspecIssue[] = [];
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

export function safeCheckTuple<E extends EntriesSchema>(
  output: Record<string, PODValue>,
  tupleSchema: PODTupleSchema<E>,
  options: EntriesParseOptions<E>,
  path: string[]
): ParseResult<Record<string, PODValue>> {
  const issues: PodspecIssue[] = [];
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
    tuple.push(output[entryKey] as PODValue);
  }

  if (validTuple) {
    if (tupleSchema.isMemberOf) {
      const matched = tupleSchema.isMemberOf.some((tupleToCheck) =>
        tupleToCheck.every((val, index) =>
          isEqualPODValue(val, tuple[index] as PODValue)
        )
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
        tupleToCheck.every((val, index) =>
          isEqualPODValue(val, tuple[index] as PODValue)
        )
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

export type PODValueNativeTypes = {
  string: string;
  int: bigint;
  cryptographic: bigint;
  eddsa_pubkey: string;
};

export type PODValueTypeToPODValue = {
  string: PODStringValue;
  int: PODIntValue;
  cryptographic: PODCryptographicValue;
  eddsa_pubkey: PODEdDSAPublicKeyValue;
};
