import {
  POD,
  type PODEntries,
  type PODValue,
  type PODContent,
  type PODStringValue,
  type PODName
} from "@pcd/pod";
import {
  PODSpecBuilder,
  type EntryTypes,
  type PODSpec,
  type StatementMap
} from "../builders/pod.js";

/**
 @TOOO
 - [ ] Return a typed POD if validation succeeds.
 - [ ] "Compile" a spec by hashing the statement parameters where necessary.
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

/**
 * Validate a POD against a PODSpec.
 *
 * @param pod - The POD to validate.
 * @param spec - The PODSpec to validate against.
 * @returns true if the POD is valid, false otherwise.
 */
function validatePOD<E extends EntryTypes, S extends StatementMap>(
  pod: POD,
  spec: PODSpec<E, S>
): pod is StrongPOD<PODEntriesFromEntryTypes<E>> {
  const podEntries = pod.content.asEntries();

  for (const [key, entryType] of Object.entries(spec.entries)) {
    if (!(key in podEntries)) {
      console.error(`Entry ${key} not found in pod`);
      return false;
    }
    if (podEntries[key]?.type !== entryType) {
      console.error(
        `Entry ${key} type mismatch: ${podEntries[key]?.type} !== ${entryType}`
      );
      return false;
    }
  }

  for (const [key, statement] of Object.entries(spec.statements)) {
    switch (statement.type) {
      case "isMemberOf":
        const tuple = statement.entries.map(
          (entry) => podEntries[entry]?.value
        );
        for (const listMember of statement.isMemberOf) {
          if (
            listMember.some((value, index) => {
              return value === tuple[index];
            })
          ) {
            break;
          }
          console.error(
            `Statement ${key} failed: could not find ${statement.entries.join(
              ", "
            )} in isMemberOf list`
          );
          return false;
        }
    }
  }

  return true;
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

    if (validatePOD(myPOD, myPodSpecBuilder.spec())) {
      // After validation, the entries are strongly typed
      myPOD.content.asEntries().bar?.value satisfies
        | PODValue["value"]
        | undefined;
      myPOD.content.asEntries().foo.value satisfies string;
      myPOD.content.getValue("bar")?.value satisfies
        | PODValue["value"]
        | undefined;
      myPOD.content.getRawValue("bar") satisfies PODValue["value"] | undefined;
      myPOD.content.getValue("foo") satisfies PODStringValue;
      myPOD.content.getRawValue("foo") satisfies string;
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
