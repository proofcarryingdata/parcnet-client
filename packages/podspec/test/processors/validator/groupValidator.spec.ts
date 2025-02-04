import { POD } from "@pcd/pod";
import type { PODEntries } from "@pcd/pod";
import { assert, describe, expect, it } from "vitest";
import { PODSpecBuilder } from "../../../src/index.js";
import { PODGroupSpecBuilder } from "../../../src/index.js";
import { groupValidator } from "../../../src/processors/validate/groupValidator.js";
import { IssueCode } from "../../../src/processors/validate/issues.js";
import { generateKeyPair } from "../../utils.js";

describe("groupValidator", () => {
  const { privateKey } = generateKeyPair();

  const signPOD = (entries: PODEntries) => POD.sign(entries, privateKey);

  const podA = signPOD({
    id: { type: "int", value: 1000n },
    num: { type: "int", value: 50n },
  });

  const podB = signPOD({
    foo: { type: "string", value: "foo" },
    other_id: { type: "int", value: 1000n },
  });

  const groupSpecBuilder = PODGroupSpecBuilder.create()
    .pod(
      "podA",
      PODSpecBuilder.create().entry("id", "int").entry("num", "int").spec()
    )
    .pod(
      "podB",
      PODSpecBuilder.create()
        .entry("foo", "string")
        .entry("other_id", "int")
        .spec()
    );

  it("should validate unrelated pods in a group", () => {
    const validator = groupValidator(groupSpecBuilder.spec());
    const result = validator.validate({
      podA,
      podB,
    });

    assert(result.isValid);
    expect(result.value.podA.content.asEntries().id.value).toBe(1000n);
    expect(result.value.podA.content.asEntries().num.value).toBe(50n);
    expect(result.value.podB.content.asEntries().foo.value).toBe("foo");
    expect(result.value.podB.content.asEntries().other_id.value).toBe(1000n);
  });

  it("should validate related pods in a group", () => {
    const specWithRelations = groupSpecBuilder.equalsEntry(
      "podA.id",
      "podB.other_id"
    );

    const validator = groupValidator(specWithRelations.spec());
    const result = validator.validate({
      podA,
      podB,
    });

    // The statement is true because the values are equal
    assert(podA.content.getValue("id")?.value === 1000n);
    assert(podB.content.getValue("other_id")?.value === 1000n);
    assert(result.isValid);

    const validator2 = groupValidator(
      // This statement should produce a negative result
      groupSpecBuilder
        .equalsEntry("podA.$contentID", "podB.$contentID", "shouldFail")
        .spec()
    );
    const result2 = validator2.validate({
      podA,
      podB,
    });

    assert(!result2.isValid);
    assert(result2.issues.length === 1);
    const issue = result2.issues[0];
    assert(issue);
    assert(issue.code === IssueCode.statement_negative_result);
    assert(issue.statementType === "equalsEntry");
    assert(issue.statementName === "shouldFail");
    assert(issue.entries.length === 2);
    assert(issue.entries[0] === "podA.$contentID");
    assert(issue.entries[1] === "podB.$contentID");
  });
});
