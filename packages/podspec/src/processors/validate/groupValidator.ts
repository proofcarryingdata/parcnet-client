import type { POD, PODName } from "@pcd/pod";
import type { NamedPODSpecs } from "../../builders/group.js";
import type { PODGroupSpec } from "../../builders/group.js";
import type { StatementMap } from "../../builders/types/statements.js";
import { assertPODGroupSpec } from "../../generated/podspec.js";
import type { NamedStrongPODs } from "../../spec/types.js";
import { EntrySourcePodGroupSpec } from "./EntrySource.js";
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
import { type ValidateOptions, podValidator } from "./podValidator.js";
import { FAILURE } from "./result.js";
import type { ValidateResult } from "./types.js";

interface PODGroupValidator<P extends NamedPODSpecs> {
  validate(pods: Record<PODName, POD>): ValidateResult<NamedStrongPODs<P>>;
  check(pods: Record<PODName, POD>): boolean;
  assert(pods: Record<PODName, POD>): asserts pods is NamedStrongPODs<P>;
  strictValidate(
    pods: Record<PODName, POD>
  ): ValidateResult<NamedStrongPODs<P>>;
  strictCheck(pods: Record<PODName, POD>): boolean;
  strictAssert(pods: Record<PODName, POD>): asserts pods is NamedStrongPODs<P>;
}

const SpecValidatorState = new WeakMap<
  PODGroupSpec<NamedPODSpecs, StatementMap>,
  boolean
>();

export function groupValidator<P extends NamedPODSpecs>(
  spec: PODGroupSpec<P, StatementMap>
): PODGroupValidator<P> {
  const validSpec = SpecValidatorState.get(spec);
  if (validSpec === undefined) {
    // If we haven't seen this spec before, we need to validate it
    try {
      assertPODGroupSpec(spec);
      // TODO check statement configuration
      // If we successfully validated the spec, we can cache the result
      SpecValidatorState.set(spec, true);
    } catch (e) {
      SpecValidatorState.set(spec, false);
      throw e;
    }
  }

  return {
    validate: (pods, exitOnError = false) =>
      validate(spec, pods, { exitOnError }),
    check: (pods) => validate(spec, pods, { exitOnError: true }).isValid,
    assert: (pods) => {
      const result = validate(spec, pods, { exitOnError: true });
      if (!result.isValid) throw new Error("POD group is not valid");
    },
    strictValidate: (pods, exitOnError = false) =>
      validate(spec, pods, { strict: true, exitOnError }),
    strictCheck: (pods) =>
      validate(spec, pods, { strict: true, exitOnError: true }).isValid,
    strictAssert: (pods) => {
      const result = validate(spec, pods, { strict: true, exitOnError: true });
      if (!result.isValid) throw new Error("POD group is not valid");
    },
  };
}

function validate<P extends NamedPODSpecs>(
  spec: PODGroupSpec<P, StatementMap>,
  pods: Record<PODName, POD>,
  options: ValidateOptions
): ValidateResult<NamedStrongPODs<P>> {
  const issues = [];
  const path: string[] = [];

  const entrySource = new EntrySourcePodGroupSpec(spec, pods);

  // TODO audit the group

  const podValidators = Object.fromEntries(
    Object.entries(spec.pods).map(([name, podSpec]) => [
      name,
      podValidator(podSpec),
    ])
  );

  for (const [name, validator] of Object.entries(podValidators)) {
    if (pods[name] === undefined) {
      throw new Error(`POD "${name}" is not defined`);
    }

    const result = options.strict
      ? validator.strictValidate(pods[name], options.exitOnError)
      : validator.validate(pods[name], options.exitOnError);

    if (!result.isValid) {
      throw new Error(`POD "${name}" is not valid`);
    }
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
    : {
        isValid: true,
        value: pods as NamedStrongPODs<P>,
      };
}
