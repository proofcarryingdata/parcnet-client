import { assertType, describe, expect, it } from "vitest";
import type { AllPODEntries } from "../../src/builders/group.js";
import { PODGroupSpecBuilder, PODSpecBuilder } from "../../src/index.js";

describe("PODGroupSpecBuilder", () => {
  it("should be a test", () => {
    expect(true).toBe(true);
  });

  it("PODGroupSpecBuilder", () => {
    const group = PODGroupSpecBuilder.create();
    const podBuilder = PODSpecBuilder.create()
      .entry("my_string", "string")
      .entry("my_num", "int");
    const groupWithPod = group.pod("foo", podBuilder.spec());
    const _spec = groupWithPod.spec();

    // Here we can see that, at the type level, we have the entry we defined
    // for the 'foo' pod, as well as the virtual entries.
    assertType<AllPODEntries<typeof _spec.pods>>({
      "foo.my_string": "string",
      "foo.my_num": "int",
      "foo.$signerPublicKey": "eddsa_pubkey",
      "foo.$contentID": "cryptographic",
    });

    expect(groupWithPod.spec()).toEqual({
      pods: {
        foo: podBuilder.spec(),
      },
      statements: {},
    });

    const groupWithPodAndStatement = groupWithPod.isMemberOf(
      ["foo.my_string"],
      ["hello"]
    );
    const spec3 = groupWithPodAndStatement.spec();

    expect(spec3).toEqual({
      pods: {
        foo: podBuilder.spec(),
      },
      statements: {
        "foo.my_string_isMemberOf": {
          entries: ["foo.my_string"],
          isMemberOf: [["hello"]],
          type: "isMemberOf",
        },
      },
    });
  });

  it("debug equalsEntry types", () => {
    const group = PODGroupSpecBuilder.create();
    const podBuilder = PODSpecBuilder.create()
      .entry("my_string", "string")
      .entry("my_other_string", "string")
      .entry("my_num", "int")
      .entry("my_other_num", "int");

    const groupWithPod = group.pod("foo", podBuilder.spec());

    // This should show us the concrete types
    assertType<AllPODEntries<ReturnType<typeof groupWithPod.spec>["pods"]>>({
      "foo.my_string": "string",
      "foo.my_other_string": "string",
      "foo.my_num": "int",
      "foo.my_other_num": "int",
      "foo.$contentID": "cryptographic",
      "foo.$signerPublicKey": "eddsa_pubkey",
    });

    groupWithPod.equalsEntry("foo.my_num", "foo.my_other_num");

    // Now let's try to see what happens in equalsEntry
    type _T1 = Parameters<typeof groupWithPod.equalsEntry>[0]; // First parameter type
    type _T2 = Parameters<typeof groupWithPod.equalsEntry>[1]; // Second parameter type
  });
});
