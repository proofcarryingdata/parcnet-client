import type { POD } from "@pcd/pod";
import type { PODSpec } from "../../builders/pod.js";
import type { EntryTypes } from "../../builders/types/entries.js";
import type { StatementMap } from "../../builders/types/statements.js";
import { assertPODSpec } from "../../generated/podspec.js";
import type { PODEntriesFromEntryTypes, StrongPOD } from "../../spec/types.js";
import { EntrySourcePodSpec } from "./EntrySource.js";
import { checkEqualsEntry } from "./checks/checkEqualsEntry.js";
import { checkGreaterThan } from "./checks/checkGreaterThan.js";
import { checkGreaterThanEq } from "./checks/checkGreaterThanEq.js";
import { checkInRange } from "./checks/checkInRange.js";
import { checkIsMemberOf } from "./checks/checkIsMemberOf.js";
import { checkIsNotMemberOf } from "./checks/checkIsNotMemberOf.js";
import { checkLessThan } from "./checks/checkLessThan.js";
import { checkLessThanEq } from "./checks/checkLessThanEq.js";
import { checkNotEqualsEntry } from "./checks/checkNotEqualsEntry.js";
import { checkNotInRange } from "./checks/checkNotInRange.js";
import { FAILURE, SUCCESS } from "./result.js";
import type { ValidateResult } from "./types.js";

/**
 @TOOO
 - [ ] "Compile" a spec by hashing the statement parameters where necessary?
*/

export interface ValidateOptions {
  /**
   * If true, the validation will exit as soon as the first error is encountered.
   */
  exitOnError?: boolean;
  /**
   * If true, the validation will reject entries in the input which are not in the spec.
   */
  strict?: boolean;
}

const DEFAULT_VALIDATE_OPTIONS: ValidateOptions = {
  exitOnError: false,
  strict: false,
};

interface PODValidator<E extends EntryTypes> {
  validate(
    pod: POD,
    exitOnError?: boolean
  ): ValidateResult<StrongPOD<PODEntriesFromEntryTypes<E>>>;
  check(pod: POD): pod is StrongPOD<PODEntriesFromEntryTypes<E>>;
  assert(pod: POD): asserts pod is StrongPOD<PODEntriesFromEntryTypes<E>>;
  strictValidate(
    pod: POD,
    exitOnError?: boolean
  ): ValidateResult<StrongPOD<PODEntriesFromEntryTypes<E>>>;
  strictCheck(pod: POD): pod is StrongPOD<PODEntriesFromEntryTypes<E>>;
  strictAssert(pod: POD): asserts pod is StrongPOD<PODEntriesFromEntryTypes<E>>;
}

const SpecValidatorState = new WeakMap<
  PODSpec<EntryTypes, StatementMap>,
  boolean
>();

export function podValidator<E extends EntryTypes, S extends StatementMap>(
  spec: PODSpec<E, S>
): PODValidator<E> {
  const validSpec = SpecValidatorState.get(spec);
  if (validSpec === undefined) {
    // If we haven't seen this spec before, we need to validate it
    try {
      assertPODSpec(spec);
      // TODO check statement configuration
      // If we successfully validated the spec, we can cache the result
      SpecValidatorState.set(spec, true);
    } catch (e) {
      SpecValidatorState.set(spec, false);
      throw e;
    }
  }

  return {
    validate: (pod, exitOnError = false) =>
      validatePOD(pod, spec, { exitOnError }),
    check: (pod): pod is StrongPOD<PODEntriesFromEntryTypes<E>> =>
      validatePOD(pod, spec, { exitOnError: true }).isValid,
    assert: (pod) => {
      const result = validatePOD(pod, spec, { exitOnError: true });
      if (!result.isValid) throw new Error("POD is not valid");
    },
    strictValidate: (pod, exitOnError = false) =>
      validatePOD(pod, spec, { strict: true, exitOnError }),
    strictCheck: (pod): pod is StrongPOD<PODEntriesFromEntryTypes<E>> =>
      validatePOD(pod, spec, { strict: true, exitOnError: true }).isValid,
    strictAssert: (pod) => {
      const result = validatePOD(pod, spec, {
        strict: true,
        exitOnError: true,
      });
      if (!result.isValid) throw new Error("POD is not valid");
    },
  };
}

/**
 * Validate a POD against a PODSpec.
 *
 * @param pod - The POD to validate.
 * @param spec - The PODSpec to validate against.
 * @param options - The options to use for validation.
 * @returns true if the POD is valid, false otherwise.
 */
function validatePOD<E extends EntryTypes, S extends StatementMap>(
  pod: POD,
  spec: PODSpec<E, S>,
  options: ValidateOptions = DEFAULT_VALIDATE_OPTIONS
): ValidateResult<StrongPOD<PODEntriesFromEntryTypes<E>>> {
  const issues = [];
  const path: string[] = [];

  const entrySource = new EntrySourcePodSpec(spec, pod);

  issues.push(...entrySource.audit(path, options));
  if (issues.length > 0) {
    // If we have missing, malformed, or unexpected entries, we should return
    // before trying to validate the statements.
    return FAILURE(issues);
  }

  for (const [key, statement] of Object.entries(spec.statements)) {
    switch (statement.type) {
      case "isMemberOf":
        issues.push(
          ...checkIsMemberOf(
            statement,
            key,
            path,
            entrySource,
            options.exitOnError ?? false
          )
        );
        break;
      case "isNotMemberOf":
        issues.push(
          ...checkIsNotMemberOf(
            statement,
            key,
            path,
            entrySource,
            options.exitOnError ?? false
          )
        );
        break;
      case "inRange":
        issues.push(
          ...checkInRange(
            statement,
            key,
            path,
            entrySource,
            options.exitOnError ?? false
          )
        );
        break;
      case "notInRange":
        issues.push(
          ...checkNotInRange(
            statement,
            key,
            path,
            entrySource,
            options.exitOnError ?? false
          )
        );
        break;
      case "equalsEntry":
        issues.push(
          ...checkEqualsEntry(
            statement,
            key,
            path,
            entrySource,
            options.exitOnError ?? false
          )
        );
        break;
      case "notEqualsEntry":
        issues.push(
          ...checkNotEqualsEntry(
            statement,
            key,
            path,
            entrySource,
            options.exitOnError ?? false
          )
        );
        break;
      case "greaterThan":
        issues.push(
          ...checkGreaterThan(
            statement,
            key,
            path,
            entrySource,
            options.exitOnError ?? false
          )
        );
        break;
      case "greaterThanEq":
        issues.push(
          ...checkGreaterThanEq(
            statement,
            key,
            path,
            entrySource,
            options.exitOnError ?? false
          )
        );
        break;
      case "lessThan":
        issues.push(
          ...checkLessThan(
            statement,
            key,
            path,
            entrySource,
            options.exitOnError ?? false
          )
        );
        break;
      case "lessThanEq":
        issues.push(
          ...checkLessThanEq(
            statement,
            key,
            path,
            entrySource,
            options.exitOnError ?? false
          )
        );
        break;
      default:
        // prettier-ignore
        statement satisfies never;
    }
    if (options.exitOnError && issues.length > 0) {
      return FAILURE(issues);
    }
  }

  return issues.length > 0
    ? FAILURE(issues)
    : SUCCESS(pod as StrongPOD<PODEntriesFromEntryTypes<E>>);
}
