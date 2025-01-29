import {
  POD,
  type PODEntries,
  type PODValue,
  type PODContent,
  type PODStringValue,
  type PODName
} from "@pcd/pod";
import { PODSpecBuilder, type PODSpec } from "../builders/pod.js";
import type { EntryTypes } from "../builders/types/entries.js";
import type { StatementMap } from "../builders/types/statements.js";
import type { ValidateResult } from "./validate/types.js";
import { FAILURE, SUCCESS } from "./validate/result.js";
import {
  IssueCode,
  type ValidationMissingEntryIssue,
  type ValidationTypeMismatchIssue,
  type ValidationUnexpectedInputEntryIssue
} from "./validate/issues.js";
import { checkIsMemberOf } from "./validate/checks/isMemberOf.js";
import { checkIsNotMemberOf } from "./validate/checks/isNotMemberOf.js";

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

interface ValidateOptions {
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

/**
 * Validate a POD against a PODSpec.
 *
 * @param pod - The POD to validate.
 * @param spec - The PODSpec to validate against.
 * @returns true if the POD is valid, false otherwise.
 */
function validatePOD<E extends EntryTypes, S extends StatementMap>(
  pod: POD,
  spec: PODSpec<E, S>,
  options: ValidateOptions = DEFAULT_VALIDATE_OPTIONS
): ValidateResult<StrongPOD<PODEntriesFromEntryTypes<E>>> {
  const podEntries = pod.content.asEntries();

  const issues = [];
  const path: string[] = [];

  for (const [key, entryType] of Object.entries(spec.entries)) {
    if (!(key in podEntries)) {
      const issue = {
        code: IssueCode.missing_entry,
        path: [...path, key],
        key
      } satisfies ValidationMissingEntryIssue;
      if (options.strict) {
        return FAILURE([issue]);
      } else {
        issues.push(issue);
      }
    }
    if (podEntries[key]?.type !== entryType) {
      const issue = {
        code: IssueCode.type_mismatch,
        path: [...path, key],
        expectedType: entryType
      } satisfies ValidationTypeMismatchIssue;
      if (options.strict) {
        return FAILURE([issue]);
      } else {
        issues.push(issue);
      }
    }
  }

  if (options.strict) {
    for (const key in podEntries) {
      if (!(key in spec.entries)) {
        const issue = {
          code: IssueCode.unexpected_input_entry,
          path: [...path, key],
          key
        } satisfies ValidationUnexpectedInputEntryIssue;
        return FAILURE([issue]);
      }
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
            podEntries,
            spec.entries,
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
            podEntries,
            spec.entries,
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

  return SUCCESS(pod as StrongPOD<PODEntriesFromEntryTypes<E>>);
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;

  const privKey =
    "f72c3def0a54280ded2990a66fabcf717130c6f2bb595004658ec77774b98924";

  const signPOD = (entries: PODEntries) => POD.sign(entries, privKey);

  test("validatePOD", () => {
    const myPOD = signPOD({ foo: { type: "string", value: "foo" } });
    const myPodSpecBuilder = PODSpecBuilder.create()
      .entry("foo", "string")
      .isMemberOf(["foo"], ["foo", "bar"]);

    // This should pass because the entry "foo" is in the list ["foo", "bar"]
    expect(validatePOD(myPOD, myPodSpecBuilder.spec())).toBe(true);

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
    expect(validatePOD(myPOD, secondBuilder.spec())).toBe(false);

    // If we omit the new statement, it should pass
    expect(
      validatePOD(
        myPOD,
        secondBuilder.omitStatements(["foo_isMemberOf_1"]).spec()
      )
    ).toBe(true);
  });
}
