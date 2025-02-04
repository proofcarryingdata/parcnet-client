import { POD, type PODEntries } from "@pcd/pod";
import { describe, expect, it } from "vitest";
import { PODSpecBuilder } from "../../../src/builders/pod.js";
import { PODGroupSpecBuilder } from "../../../src/index.js";
import { PODDB } from "../../../src/processors/db/podDB.js";
import { generateKeyPair } from "../../utils.js";

describe("PODDB", () => {
  const { privateKey } = generateKeyPair();
  const podSign = (pod: PODEntries) => POD.sign(pod, privateKey);

  const pod1 = podSign({
    id: { type: "int", value: 1n },
    num: { type: "int", value: 50n },
  });

  const pod2 = podSign({
    id: { type: "int", value: 2n },
    other_id: { type: "int", value: 1n },
  });

  const pod3 = podSign({
    id: { type: "int", value: 3n },
    other_id: { type: "int", value: 1n },
  });

  it("should be able to query by spec", () => {
    const db = new PODDB();
    db.insertMany([pod1, pod2, pod3]);

    const podSpec = PODGroupSpecBuilder.create()
      .pod("pod1", PODSpecBuilder.create().entry("id", "int").spec())
      .pod("pod2", PODSpecBuilder.create().entry("other_id", "int").spec())
      .equalsEntry("pod1.id", "pod2.other_id")
      .spec();

    const result = db.queryByGroupSpec(podSpec);
    expect(result.length).toBe(2);
    // We have two valid combinations. In both cases, the pod1 slot is filled
    // by pod1, and the pod2 slot is filled by pod2 and pod3 respectively.
    expect(result[0]!.pod1.contentID).toBe(pod1.contentID);
    expect(result[0]!.pod2.contentID).toBe(pod2.contentID);
    expect(result[1]!.pod1.contentID).toBe(pod1.contentID);
    expect(result[1]!.pod2.contentID).toBe(pod3.contentID);
  });
});
