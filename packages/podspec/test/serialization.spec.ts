import {
  type GPCBoundConfig,
  boundConfigToJSON,
  gpcProve,
  podMembershipListsToJSON,
  proofConfigToJSON,
  revealedClaimsToJSON
} from "@pcd/gpc";
import { POD } from "@pcd/pod";
import { describe, expect, it } from "vitest";
import * as p from "../src/index.js";
import { GPC_NPM_ARTIFACTS_PATH } from "./constants.js";
import { generateKeyPair } from "./utils.js";

describe("should be able to serialize outputs", function () {
  it("should serialize proof request outputs", async function () {
    const { publicKey, privateKey } = generateKeyPair();

    const pod1 = p.pod({
      entries: {
        foo: { type: "string" },
        bar: {
          type: "int",
          inRange: { min: 0n, max: 10n }
        }
      },
      signerPublicKey: {
        isMemberOf: [publicKey]
      },
      tuples: [
        {
          entries: ["$signerPublicKey", "foo", "bar"],
          isMemberOf: [
            [
              { type: "eddsa_pubkey", value: publicKey },
              { type: "string", value: "test" },
              { type: "int", value: 5n }
            ]
          ]
        }
      ]
    });
    const prs = p.proofRequest({
      pods: {
        pod1: pod1.proofConfig({ revealed: { foo: true, bar: true } })
      },
      watermark: { type: "string", value: "1" },
      externalNullifier: { type: "string", value: "1" }
    });

    const pr = prs.getProofRequest();

    expect(() => proofConfigToJSON(pr.proofConfig)).to.not.throw;
    expect(() => podMembershipListsToJSON(pr.membershipLists)).to.not.throw;

    const pod = POD.sign(
      {
        foo: { type: "string", value: "test" },
        bar: { type: "int", value: 5n }
      },
      privateKey
    );

    const proof = await gpcProve(
      pr.proofConfig,
      {
        membershipLists: pr.membershipLists,
        pods: { pod1: pod }
      },
      GPC_NPM_ARTIFACTS_PATH
    );

    pr.proofConfig.circuitIdentifier = proof.boundConfig.circuitIdentifier;
    const boundConfig: GPCBoundConfig = {
      ...pr.proofConfig,
      circuitIdentifier: proof.boundConfig.circuitIdentifier
    };

    expect(() => boundConfigToJSON(boundConfig)).to.not.throw;
    expect(() => revealedClaimsToJSON(proof.revealedClaims)).to.not.throw;
  });
});
