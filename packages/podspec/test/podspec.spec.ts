import crypto from "crypto";
import path from "path";
import type { GPCBoundConfig } from "@pcd/gpc";
import { gpcProve, gpcVerify } from "@pcd/gpc";
import {
  POD,
  POD_INT_MAX,
  POD_INT_MIN,
  decodePrivateKey,
  encodePublicKey
} from "@pcd/pod";
import { derivePublicKey } from "@zk-kit/eddsa-poseidon";
import { v4 as uuidv4 } from "uuid";
import { assert, describe, expect, it } from "vitest";
import type {
  PodspecNotInListIssue,
  PodspecNotInRangeIssue,
  PodspecNotInTupleListIssue
} from "../src/error.js";
import { IssueCode } from "../src/error.js";
import * as p from "../src/index.js";
import { $i, $s } from "../src/pod_value_utils.js";
import type { EntriesTupleSchema } from "../src/schemas/entries.js";

export const GPC_NPM_ARTIFACTS_PATH = path.join(
  __dirname,
  "../node_modules/@pcd/proto-pod-gpc-artifacts"
);

function generateRandomHex(byteLength: number): string {
  const randomBytes = crypto.randomBytes(byteLength);
  return randomBytes.toString("hex");
}

function generateKeyPair(): { privateKey: string; publicKey: string } {
  const privateKey = generateRandomHex(32);
  const publicKey = encodePublicKey(
    derivePublicKey(decodePrivateKey(privateKey))
  );
  return { privateKey, publicKey };
}

describe.concurrent("podspec should work", function () {
  it("should validate POD entries", () => {
    const entriesSpec = p.entries({
      firstName: {
        type: "string",
        // $s is a utility function for turning strings into PODStringValues
        isMemberOf: $s(["test", "1234"])
      },
      age: {
        type: "int",
        isNotMemberOf: $i([42])
      },
      semaphoreId: {
        type: "cryptographic",
        isMemberOf: p.$c([1000])
      },
      publicKey: {
        type: "eddsa_pubkey"
      }
    });

    const { publicKey } = generateKeyPair();

    const result = entriesSpec.safeParse({
      firstName: {
        type: "string",
        value: "test"
      },
      age: {
        type: "int",
        value: 41n
      },
      semaphoreId: {
        type: "cryptographic",
        value: 1000n
      },
      publicKey: {
        type: "eddsa_pubkey",
        value: publicKey
      }
    });

    assert(result.isValid);
    expect(result.value.firstName).to.eql({ type: "string", value: "test" });
    expect(result.value.age).to.eql({ type: "int", value: 41n });
    expect(result.value.semaphoreId).to.eql({
      type: "cryptographic",
      value: 1000n
    });
    expect(result.value.publicKey).to.eql({
      type: "eddsa_pubkey",
      value: publicKey
    });
  });

  /**
   * If we want to create a new POD and we have some JavaScript values, we can
   * do some simple coercion of those JavaScript values into POD values. This
   * is achieved by wrapping the plain values in a {@link PODValue}, or in the
   * case of JavaScript numbers, converting them to bigints before wrapping
   * them.
   */
  it("should coerce javascript values into POD types", function () {
    const entriesSpec = p.entries({
      firstName: {
        type: "string",
        isMemberOf: $s(["test", "1234"])
      },
      age: {
        type: "int",
        isNotMemberOf: $i([42])
      },
      semaphoreId: {
        type: "cryptographic",
        isMemberOf: p.$c([1000])
      },
      publicKey: {
        type: "eddsa_pubkey"
      }
    });

    const { publicKey } = generateKeyPair();

    const result = entriesSpec.safeParse(
      {
        firstName: "test",
        age: 41, // numbers can be coerced to bigint
        semaphoreId: 1000n,
        publicKey: publicKey
      },
      { coerce: true }
    );

    assert(result.isValid);
    expect(result.value.firstName).to.eql({ type: "string", value: "test" });
    expect(result.value.age).to.eql({ type: "int", value: 41n });
    expect(result.value.semaphoreId).to.eql({
      type: "cryptographic",
      value: 1000n
    });
    expect(result.value.publicKey).to.eql({
      type: "eddsa_pubkey",
      value: publicKey
    });
  });

  it("should fail with bad inputs", function () {
    const myPodSpec = p.entries({
      foo: { type: "string" },
      bar: { type: "int" }
    });

    const result = myPodSpec.safeParse(
      {
        foo: "test",
        bar: POD_INT_MAX + 1n
      },
      { coerce: true }
    );
    expect(result.isValid).to.eq(false);
    assert(result.isValid === false);
    expect(result.issues).to.eql([
      {
        code: IssueCode.invalid_pod_value,
        value: {
          type: "int",
          value: POD_INT_MAX + 1n
        },
        reason: `Invalid value for entry ${"bar"}.       Value ${
          POD_INT_MAX + 1n
        } is outside supported bounds: (min ${POD_INT_MIN}, max ${POD_INT_MAX}).`,
        path: ["bar"]
      }
    ]);
  });

  it("should fail to instantiate a Podspec with invalid entries", function () {
    expect(() =>
      p.entries({
        foo: { type: "string" },
        bar: { type: "invalid" } as never
      })
    ).to.throw();
  });

  it("should apply range checks", function () {
    const myPodSpec = p.entries({
      foo: { type: "int", inRange: { min: 1n, max: 10n } }
    });

    const result = myPodSpec.safeParse({
      foo: { type: "int", value: 11n }
    });
    expect(result.isValid).to.eq(false);
    assert(result.isValid === false);
    expect(result.issues).to.eql([
      {
        code: IssueCode.not_in_range,
        min: 1n,
        max: 10n,
        value: 11n,
        path: ["foo"]
      } satisfies PodspecNotInRangeIssue
    ]);
  });

  it("should test string entries for list membership", function () {
    const myPodSpec = p.entries({
      foo: {
        type: "string",
        isMemberOf: $s(["test", "other_string"])
      }
    });

    const result = myPodSpec.safeParse({
      foo: { type: "string", value: "test" }
    });
    expect(result.isValid).to.eq(true);
    assert(result.isValid);

    const result2 = myPodSpec.safeParse({
      foo: { type: "string", value: "not in list" }
    });
    expect(result2.isValid).to.eq(false);
    assert(result2.isValid === false);
    expect(result2.issues).to.eql([
      {
        code: IssueCode.not_in_list,
        value: { type: "string", value: "not in list" },
        list: $s(["test", "other_string"]),
        path: ["foo"]
      } satisfies PodspecNotInListIssue
    ]);
  });

  it("should test integer entries for list membership", function () {
    const myPodSpec = p.entries({
      foo: { type: "int", isMemberOf: $i([1n, 2n, 3n]) }
    });

    const result = myPodSpec.safeParse({
      foo: {
        type: "int",
        value: 1n
      }
    });
    expect(result.isValid).to.eq(true);
    assert(result.isValid);

    const result2 = myPodSpec.safeParse({
      foo: {
        type: "int",
        value: 4n
      }
    });
    expect(result2.isValid).to.eq(false);
    assert(!result2.isValid);
    expect(result2.issues).to.eql([
      {
        code: IssueCode.not_in_list,
        value: { type: "int", value: 4n },
        list: $i([1n, 2n, 3n]),
        path: ["foo"]
      } satisfies PodspecNotInListIssue
    ]);
  });

  it("should match on tuples", function () {
    const myPodSpec = p.entries({
      foo: { type: "string" },
      bar: { type: "int" }
    });

    const tuples: EntriesTupleSchema<typeof myPodSpec.schema>[] = [
      {
        entries: ["foo", "bar"],
        isMemberOf: [
          [
            { type: "string", value: "test" },
            { type: "int", value: 1n }
          ]
        ]
      }
    ];

    {
      const result = myPodSpec.safeParse(
        {
          foo: { type: "string", value: "test" },
          bar: { type: "int", value: 1n }
        },
        {
          tuples
        }
      );
      expect(result.isValid).to.eq(true);
    }
    {
      const result = myPodSpec.safeParse(
        {
          foo: { type: "string", value: "other string" },
          bar: { type: "int", value: 1n }
        },
        { tuples }
      );
      expect(result.isValid).to.eq(false);
      assert(result.isValid === false);
      expect(result.issues).to.eql([
        {
          code: IssueCode.not_in_tuple_list,
          value: [
            { type: "string", value: "other string" },
            { type: "int", value: 1n }
          ],
          list: [
            [
              { type: "string", value: "test" },
              { type: "int", value: 1n }
            ]
          ],
          path: ["$tuples", "0"]
        } satisfies PodspecNotInTupleListIssue
      ]);
    }
    {
      const result = myPodSpec.safeParse(
        {
          foo: { type: "string", value: "test" },
          bar: { type: "int", value: 2n }
        },
        { tuples }
      );
      expect(result.isValid).to.eq(false);
      assert(result.isValid === false);
      expect(result.issues).to.eql([
        {
          code: IssueCode.not_in_tuple_list,
          value: [
            { type: "string", value: "test" },
            { type: "int", value: 2n }
          ],
          list: [
            [
              { type: "string", value: "test" },
              { type: "int", value: 1n }
            ]
          ],
          path: ["$tuples", "0"]
        } satisfies PodspecNotInTupleListIssue
      ]);
    }
  });

  it("should handle optional entries", function () {
    const optionalPodSpec = p.entries({
      foo: { type: "string" },
      bar: { type: "optional", innerType: { type: "int" } }
    });

    const resultWithOptional = optionalPodSpec.safeParse({
      foo: { type: "string", value: "test" },
      bar: { type: "int", value: 123n }
    });
    expect(resultWithOptional.isValid).to.eq(true);

    const resultWithoutOptional = optionalPodSpec.safeParse({
      foo: { type: "string", value: "test" }
    });
    expect(resultWithoutOptional.isValid).to.eq(true);
  });

  it("should validate entire PODs", function () {
    const { privateKey } = generateKeyPair();
    const eventId = "d1390b7b-4ccb-42bf-8c8b-e397b7c26e6c";
    const productId = "d38f0c3f-586b-44c6-a69a-1348481e927d";

    const myPodSpec = p.pod({
      entries: {
        eventId: { type: "string" },
        productId: { type: "string" },
        imageUrl: { type: "optional", innerType: { type: "string" } }
      }
    });

    const pod = POD.sign(
      {
        eventId: { type: "string", value: eventId },
        productId: { type: "string", value: productId }
      },
      privateKey
    );

    const result = myPodSpec.safeParse(pod);
    assert(result.isValid);
  });

  it("should perform tuple checks on PODs including virtual signer entry", function () {
    const { publicKey, privateKey } = generateKeyPair();
    const eventId = "d1390b7b-4ccb-42bf-8c8b-e397b7c26e6c";
    const productId = "d38f0c3f-586b-44c6-a69a-1348481e927d";

    const myPodSpec = p.pod({
      entries: {
        eventId: { type: "string" },
        productId: { type: "string" }
      },
      tuples: [
        {
          entries: ["eventId", "productId", "$signerPublicKey"],
          isMemberOf: [
            [
              { type: "string", value: eventId },
              { type: "string", value: productId },
              { type: "eddsa_pubkey", value: publicKey }
            ]
          ]
        }
      ]
    });

    {
      const pod = POD.sign(
        {
          eventId: { type: "string", value: eventId },
          productId: { type: "string", value: productId }
        },
        privateKey
      );

      const result = myPodSpec.safeParse(pod);
      expect(result.isValid).to.eq(true);
      assert(result.isValid);
    }
    {
      const pod = POD.sign(
        {
          eventId: { type: "string", value: uuidv4() },
          productId: { type: "string", value: uuidv4() },
          foo: { type: "eddsa_pubkey", value: publicKey }
        },
        privateKey
      );

      const result = myPodSpec.safeParse(pod);
      expect(result.isValid).to.eq(false);
      assert(result.isValid === false);
      assert(result.issues[0] !== undefined);
      expect(result.issues[0].code).to.eq(IssueCode.not_in_tuple_list);
    }
  });

  it("should query across multiple PODs", function () {
    const key = generateRandomHex(32);

    const myPodSpec = p.pod({
      entries: {
        foo: { type: "string" },
        bar: { type: "int" }
      }
    });

    const pods = [
      POD.sign(
        {
          foo: { type: "string", value: "just a string" }
        },
        key
      ),
      POD.sign(
        {
          foo: { type: "string", value: "test" },
          bar: { type: "int", value: 1n }
        },
        key
      )
    ];

    const queryResult = myPodSpec.query(pods);

    expect(queryResult.matches[0]).to.eq(pods[1]);
    expect(queryResult.matchingIndexes).to.eql([1]);
  });

  it("should apply range checks in queries", function () {
    const key = generateRandomHex(32);
    const myPodSpec = p.pod({
      entries: {
        foo: { type: "int", inRange: { min: 1n, max: 10n } }
      }
    });

    const pods = [
      POD.sign({ foo: { type: "int", value: 1n } }, key),
      POD.sign({ foo: { type: "int", value: 11n } }, key),
      POD.sign({ foo: { type: "int", value: 0n } }, key),
      POD.sign({ foo: { type: "int", value: 10n } }, key)
    ];

    const queryResult = myPodSpec.query(pods);

    expect(queryResult.matches).to.eql([pods[0], pods[3]]);
    expect(queryResult.matchingIndexes).to.eql([0, 3]);
  });

  it("should match on tuples in queries", function () {
    const { publicKey, privateKey } = generateKeyPair();
    const eventId = "d1390b7b-4ccb-42bf-8c8b-e397b7c26e6c";
    const productId = "d38f0c3f-586b-44c6-a69a-1348481e927d";

    const myPodSpec = p.pod({
      entries: {
        eventId: { type: "string" },
        productId: { type: "string" }
      },
      tuples: [
        {
          entries: ["eventId", "productId", "$signerPublicKey"],
          isMemberOf: [
            [
              { type: "string", value: eventId },
              { type: "string", value: productId },
              { type: "eddsa_pubkey", value: publicKey }
            ]
          ]
        }
      ]
    });

    const pods = [
      POD.sign(
        {
          eventId: { type: "string", value: eventId },
          productId: { type: "string", value: productId }
        },
        privateKey
      ),
      POD.sign(
        {
          eventId: { type: "string", value: uuidv4() },
          productId: { type: "string", value: uuidv4() }
        },
        privateKey
      )
    ];

    const queryResult = myPodSpec.query(pods);

    expect(queryResult.matches).to.eql([pods[0]]);
    expect(queryResult.matchingIndexes).to.eql([0]);
  });

  it("can query for PODs with matching signatures", function () {
    const { publicKey, privateKey } = generateKeyPair();
    const eventId = "d1390b7b-4ccb-42bf-8c8b-e397b7c26e6c";
    const productId = "d38f0c3f-586b-44c6-a69a-1348481e927d";

    const pods = [
      POD.sign(
        {
          eventId: { type: "string", value: eventId },
          productId: { type: "string", value: productId },
          signerPublicKey: { type: "eddsa_pubkey", value: publicKey }
        },
        privateKey
      ),
      POD.sign(
        {
          eventId: { type: "string", value: uuidv4() },
          productId: { type: "string", value: uuidv4() },
          signerPublicKey: { type: "eddsa_pubkey", value: publicKey }
        },
        privateKey
      )
    ] as const;

    const myPodSpec = p.pod({
      entries: {
        eventId: { type: "string" },
        productId: { type: "string" }
      },
      signature: {
        isMemberOf: [pods[1].signature]
      }
    });

    const queryResult = myPodSpec.query(pods.slice());

    expect(queryResult.matches).to.eql([pods[1]]);
    expect(queryResult.matchingIndexes).to.eql([1]);
  });

  it("should generate proof requests", async function () {
    const prs = p.proofRequest({
      pods: {
        pod1: {
          entries: {
            foo: { type: "string", isRevealed: true },
            bar: {
              type: "int",
              inRange: { min: 0n, max: 10n },
              isRevealed: true
            }
          },
          tuples: [
            {
              entries: ["foo", "bar"],
              isMemberOf: [
                [
                  { type: "string", value: "test" },
                  { type: "int", value: 5n }
                ]
              ]
            }
          ]
        }
      },
      watermark: { type: "string", value: "1" },
      externalNullifier: { type: "string", value: "1" }
    });

    const { privateKey } = generateKeyPair();

    const pod = POD.sign(
      {
        foo: { type: "string", value: "test" },
        bar: { type: "int", value: 5n }
      },
      privateKey
    );

    const pr = prs.getProofRequest();

    const proof = await gpcProve(
      pr.proofConfig,
      {
        membershipLists: pr.membershipLists,
        pods: { pod1: pod }
      },
      GPC_NPM_ARTIFACTS_PATH
    );

    pr.proofConfig.circuitIdentifier = proof.boundConfig.circuitIdentifier;

    const result = await gpcVerify(
      proof.proof,
      pr.proofConfig as GPCBoundConfig,
      proof.revealedClaims,
      GPC_NPM_ARTIFACTS_PATH
    );
    assert(result);
  });

  it("should generate candidate inputs from a POD collection", async function () {
    const prs = p.proofRequest({
      pods: {
        pod1: {
          entries: {
            foo: { type: "string", isRevealed: true },
            bar: {
              type: "int",
              inRange: { min: 0n, max: 10n },
              isRevealed: true
            }
          }
        },
        pod2: {
          entries: {
            baz: { type: "cryptographic", isRevealed: true },
            quux: {
              type: "string",
              isMemberOf: [{ type: "string", value: "magic" }]
            }
          }
        }
      },
      watermark: { type: "string", value: "1" },
      externalNullifier: { type: "string", value: "1" }
    });

    const { privateKey } = generateKeyPair();

    // This simulates a user's POD collection, where we want to find the PODs
    // which could be inputs for the proof request
    const pods: POD[] = [
      POD.sign(
        {
          foo: { type: "string", value: "aaaaaa" },
          bar: { type: "int", value: 11n }
        },
        privateKey
      ),
      POD.sign(
        {
          foo: { type: "string", value: "bbbbbb" },
          bar: { type: "int", value: 10n }
        },
        privateKey
      ),
      POD.sign(
        {
          baz: { type: "cryptographic", value: 1000000000n },
          quux: { type: "string", value: "doesn't match" }
        },
        privateKey
      ),
      POD.sign(
        {
          baz: { type: "cryptographic", value: 1000n },
          quux: { type: "string", value: "magic" }
        },
        privateKey
      )
    ];

    const candidatePODs = prs.queryForInputs(pods);

    expect(candidatePODs.pod1).to.eql([pods[1]]);
    expect(candidatePODs.pod2).to.eql([pods[3]]);
    assert(candidatePODs.pod1[0] !== undefined);
    assert(candidatePODs.pod2[0] !== undefined);

    const pr = prs.getProofRequest();

    const proof = await gpcProve(
      pr.proofConfig,
      {
        membershipLists: pr.membershipLists,
        pods: { pod1: candidatePODs.pod1[0], pod2: candidatePODs.pod2[0] }
      },
      GPC_NPM_ARTIFACTS_PATH
    );

    pr.proofConfig.circuitIdentifier = proof.boundConfig.circuitIdentifier;

    const result = await gpcVerify(
      proof.proof,
      pr.proofConfig as GPCBoundConfig,
      proof.revealedClaims,
      GPC_NPM_ARTIFACTS_PATH
    );
    assert(result);
  });
});
