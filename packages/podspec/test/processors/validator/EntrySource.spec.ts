import { POD, type PODEntries } from "@pcd/pod";
import { describe, expect, it } from "vitest";
import { PODGroupSpecBuilder, PODSpecBuilder } from "../../../src/index.js";
import {
  EntrySourcePodGroupSpec,
  EntrySourcePodSpec,
} from "../../../src/processors/validate/EntrySource.js";
import { generateKeyPair } from "../../utils.js";

describe("EntrySource", () => {
  const { privateKey, publicKey } = generateKeyPair();
  const podSign = (pod: PODEntries) => POD.sign(pod, privateKey);

  it("should retrieve entries for a PODSpec", () => {
    const podSpec = PODSpecBuilder.create()
      .entry("id", "int")
      .entry("num", "int")
      .spec();
    const pod = podSign({
      id: { type: "int", value: 1000n },
      num: { type: "int", value: 50n },
    });

    const entrySource = new EntrySourcePodSpec(podSpec, pod);

    expect(entrySource.getEntry("id")!.value).toBe(1000n);
    expect(entrySource.getEntryTypeFromSpec("id")).toBe("int");

    expect(entrySource.getEntry("$signerPublicKey")!.value).toBe(publicKey);
    expect(entrySource.getEntryTypeFromSpec("$signerPublicKey")).toBe(
      "eddsa_pubkey"
    );

    expect(entrySource.getEntry("$contentID")!.value).toBe(
      pod.content.contentID
    );
    expect(entrySource.getEntryTypeFromSpec("$contentID")).toBe(
      "cryptographic"
    );

    expect(entrySource.getEntry("foo")).toBeUndefined();
    expect(entrySource.getEntryTypeFromSpec("foo")).toBeUndefined();
  });

  it("should retrieve entries for a PODGroupSpec", () => {
    const podA = podSign({
      id: { type: "int", value: 1000n },
      num: { type: "int", value: 50n },
    });
    const podB = podSign({
      foo: { type: "string", value: "foo" },
      other_id: { type: "int", value: 1000n },
    });
    const podGroupSpec = PODGroupSpecBuilder.create()
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
      )
      .spec();

    const entrySource = new EntrySourcePodGroupSpec(podGroupSpec, {
      podA: podA,
      podB: podB,
    });

    expect(entrySource.getEntry("podA.id")!.value).toBe(1000n);
    expect(entrySource.getEntry("podA.num")!.value).toBe(50n);
    expect(entrySource.getEntry("podB.foo")!.value).toBe("foo");
    expect(entrySource.getEntry("podB.other_id")!.value).toBe(1000n);

    expect(entrySource.getEntryTypeFromSpec("podA.id")).toBe("int");
    expect(entrySource.getEntryTypeFromSpec("podA.num")).toBe("int");
    expect(entrySource.getEntryTypeFromSpec("podB.foo")).toBe("string");
    expect(entrySource.getEntryTypeFromSpec("podB.other_id")).toBe("int");

    expect(entrySource.getEntry("podA.$signerPublicKey")!.value).toBe(
      publicKey
    );
    expect(entrySource.getEntryTypeFromSpec("podA.$signerPublicKey")).toBe(
      "eddsa_pubkey"
    );

    expect(entrySource.getEntry("podA.$contentID")!.value).toBe(
      podA.content.contentID
    );
    expect(entrySource.getEntryTypeFromSpec("podA.$contentID")).toBe(
      "cryptographic"
    );

    expect(entrySource.getEntry("podC.id")).toBeUndefined();
    expect(entrySource.getEntryTypeFromSpec("podC.id")).toBeUndefined();

    expect(entrySource.getEntry("podA.something")).toBeUndefined();
    expect(entrySource.getEntryTypeFromSpec("podA.something")).toBeUndefined();
  });
});
