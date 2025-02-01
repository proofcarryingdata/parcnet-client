import {
  type PODEntries,
  POD,
  type PODValue,
  type PODStringValue,
  type PODIntValue
} from "@pcd/pod";
import { describe, it, expect, assert } from "vitest";
import { PODSpecBuilder, validatePOD } from "../../../src/index.js";

describe("validator", () => {
  it("should be a test", () => {
    expect(true).toBe(true);
  });

  const privKey =
    "f72c3def0a54280ded2990a66fabcf717130c6f2bb595004658ec77774b98924";

  const signPOD = (entries: PODEntries) => POD.sign(entries, privKey);

  it("validatePOD", () => {
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
});
