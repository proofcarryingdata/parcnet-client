import {
  POD,
  type PODEntries,
  type PODValue,
  type PODContent,
  type PODStringValue,
  type PODName,
  type PODIntValue
} from "@pcd/pod";
import { PODSpecBuilder, type PODSpec } from "../builders/pod.js";
import type { EntryTypes } from "../builders/types/entries.js";
import type { StatementMap } from "../builders/types/statements.js";
import type { ValidateResult } from "./validate/types.js";
import { FAILURE, SUCCESS } from "./validate/result.js";
import { checkIsMemberOf } from "./validate/checks/isMemberOf.js";
import { checkIsNotMemberOf } from "./validate/checks/isNotMemberOf.js";
import { assertPODSpec } from "../generated/podspec.js";
import { EntrySourcePodSpec } from "./validate/EntrySource.js";
import { assert } from "vitest";
import { checkInRange } from "./validate/checks/inRange.js";
import { checkNotInRange } from "./validate/checks/notInRange.js";
import { checkEqualsEntry } from "./validate/checks/equalsEntry.js";
import { checkNotEqualsEntry } from "./validate/checks/notEqualsEntry.js";

/**
 @TOOO
 - [ ] "Compile" a spec by hashing the statement parameters where necessary?
*/

/**
 * "Strong" PODContent is an extension of PODContent which extends the
 * `asEntries()` method to return a strongly-typed PODEntries.
 */
interface StrongPODContent<T extends PODEntries> extends PODContent {
  asEntries(): T & PODEntries;
  getValue<N extends keyof T | PODName>(
    name: N
  ): N extends keyof T ? T[N] : PODValue;
  getRawValue<N extends keyof T | PODName>(
    name: N
  ): N extends keyof T ? T[N]["value"] : PODValue["value"];
}

/**
 * A "strong" POD is a POD with a strongly-typed entries.
 */
export interface StrongPOD<T extends PODEntries> extends POD {
  content: StrongPODContent<T>;
}

type PODEntriesFromEntryTypes<E extends EntryTypes> = {
  [K in keyof E]: Extract<PODValue, { type: E[K] }>;
};

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
  strict: false
};

interface PODValidator<E extends EntryTypes> {
  validate(pod: POD): ValidateResult<StrongPOD<PODEntriesFromEntryTypes<E>>>;
  check(pod: POD): boolean;
  assert(pod: POD): asserts pod is StrongPOD<PODEntriesFromEntryTypes<E>>;
  strictValidate(
    pod: POD
  ): ValidateResult<StrongPOD<PODEntriesFromEntryTypes<E>>>;
  strictCheck(pod: POD): boolean;
  strictAssert(pod: POD): asserts pod is StrongPOD<PODEntriesFromEntryTypes<E>>;
}

function validate<E extends EntryTypes, S extends StatementMap>(
  spec: PODSpec<E, S>
): PODValidator<E> {
  // @TODO maybe typia's clone is better
  spec = structuredClone(spec);
  assertPODSpec(spec);

  return {
    validate: (pod) => validatePOD(pod, spec, {}),
    check: (pod) => validatePOD(pod, spec, { exitOnError: true }).isValid,
    assert: (pod) => {
      const result = validatePOD(pod, spec, { exitOnError: true });
      if (!result.isValid) throw new Error("POD is not valid");
    },
    strictValidate: (pod) => validatePOD(pod, spec, { strict: true }),
    strictCheck: (pod) =>
      validatePOD(pod, spec, { strict: true, exitOnError: true }).isValid,
    strictAssert: (pod) => {
      const result = validatePOD(pod, spec, {
        strict: true,
        exitOnError: true
      });
      if (!result.isValid) throw new Error("POD is not valid");
    }
  };
}

const SpecValidatorState = new WeakMap<
  PODSpec<EntryTypes, StatementMap>,
  boolean
>();

/**
 * Validate a POD against a PODSpec.
 *
 * @param pod - The POD to validate.
 * @param spec - The PODSpec to validate against.
 * @param options - The options to use for validation.
 * @returns true if the POD is valid, false otherwise.
 */
export function validatePOD<E extends EntryTypes, S extends StatementMap>(
  pod: POD,
  spec: PODSpec<E, S>,
  options: ValidateOptions = DEFAULT_VALIDATE_OPTIONS
): ValidateResult<StrongPOD<PODEntriesFromEntryTypes<E>>> {
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

      default:
        // prettier-ignore
        statement.type satisfies never;
      // maybe throw an exception here
    }
    if (options.exitOnError && issues.length > 0) {
      return FAILURE(issues);
    }
  }

  return issues.length > 0
    ? FAILURE(issues)
    : SUCCESS(pod as StrongPOD<PODEntriesFromEntryTypes<E>>);
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;

  const privKey =
    "f72c3def0a54280ded2990a66fabcf717130c6f2bb595004658ec77774b98924";

  const signPOD = (entries: PODEntries) => POD.sign(entries, privKey);

  test("validatePOD", () => {
    const myPOD = signPOD({
      foo: { type: "string", value: "foo" },
      num: { type: "int", value: 50n }
    });
    const myPodSpecBuilder = PODSpecBuilder.create()
      .entry("foo", "string")
      .isMemberOf(["foo"], ["foo", "bar"]);

    // This should pass because the entry "foo" is in the list ["foo", "bar"]
    expect(validatePOD(myPOD, myPodSpecBuilder.spec()).isValid).toBe(true);

    const result = validatePOD(myPOD, myPodSpecBuilder.spec());
    if (result.isValid) {
      const pod = result.value;
      // After validation, the entries are strongly typed
      pod.content.asEntries().bar?.value satisfies
        | PODValue["value"]
        | undefined;
      pod.content.asEntries().foo.value satisfies string;
      pod.content.getValue("bar")?.value satisfies
        | PODValue["value"]
        | undefined;
      pod.content.getRawValue("bar") satisfies PODValue["value"] | undefined;
      pod.content.getValue("foo") satisfies PODStringValue;
      pod.content.getRawValue("foo") satisfies string;
    }

    // This should fail because the entry "foo" is not in the list ["baz", "quux"]
    const secondBuilder = myPodSpecBuilder.isMemberOf(["foo"], ["baz", "quux"]);
    expect(validatePOD(myPOD, secondBuilder.spec()).isValid).toBe(false);

    // If we omit the new statement, it should pass
    expect(
      validatePOD(
        myPOD,
        secondBuilder.omitStatements(["foo_isMemberOf_1"]).spec()
      ).isValid
    ).toBe(true);

    {
      const result = validatePOD(
        myPOD,
        secondBuilder
          .omitStatements(["foo_isMemberOf_1"])
          .entry("num", "int")
          .inRange("num", { min: 0n, max: 100n })
          .spec()
      );
      assert(result.isValid);
      const pod = result.value;
      pod.content.asEntries().num satisfies PODIntValue;
    }
  });
}
