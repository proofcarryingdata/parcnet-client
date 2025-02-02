import {
  POD,
  type PODEntries,
  type PODIntValue,
  type PODStringValue,
  type PODValue,
} from "@pcd/pod";
import { assert, describe, expect, it } from "vitest";
import { PODSpecBuilder } from "../../../src/index.js";
import { validate } from "../../../src/processors/validate.js";
import { generateKeyPair } from "../../utils.js";

describe("validator", () => {
  it("should be a test", () => {
    expect(true).toBe(true);
  });

  const { privateKey } = generateKeyPair();

  const signPOD = (entries: PODEntries) => POD.sign(entries, privateKey);

  it("validatePOD", () => {
    const myPOD = signPOD({
      foo: { type: "string", value: "foo" },
      num: { type: "int", value: 50n },
    });
    const myPodSpecBuilder = PODSpecBuilder.create()
      .entry("foo", "string")
      .isMemberOf(["foo"], ["foo", "bar"]);

    // This should pass because the entry "foo" is in the list ["foo", "bar"]
    expect(validate(myPodSpecBuilder.spec()).check(myPOD)).toBe(true);

    const result = validate(myPodSpecBuilder.spec()).validate(myPOD);
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
    expect(validate(secondBuilder.spec()).check(myPOD)).toBe(false);

    // If we omit the new statement, it should pass
    expect(
      validate(secondBuilder.omitStatements(["foo_isMemberOf_1"]).spec()).check(
        myPOD
      )
    ).toBe(true);

    {
      const result = validate(
        secondBuilder
          .omitStatements(["foo_isMemberOf_1"])
          .entry("num", "int")
          .inRange("num", { min: 0n, max: 100n })
          .spec()
      ).validate(myPOD);
      assert(result.isValid);
      const pod = result.value;
      pod.content.asEntries().num satisfies PODIntValue;
    }
  });
});
