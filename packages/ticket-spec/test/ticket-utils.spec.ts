import { encodePublicKey } from "@pcd/pod";
import { Identity as IdentityV4 } from "@semaphore-protocol/core/identity";
import { Identity as IdentityV3 } from "@semaphore-protocol/identity";
import { v4 as uuidv4 } from "uuid";
import { describe, expect, it } from "vitest";
import { assert } from "vitest";
import { TicketSpec, ticketProofRequest } from "../src/index.js";

const identityV3 = new IdentityV3();
const identityV4 = new IdentityV4();

describe("ticket-utils", () => {
  it("should parse JavaScript ticket data to POD entries", () => {
    const ticketData = {
      ticketId: "302bdf00-60d9-4b0c-a07b-a6ef64d27a71",
      eventId: uuidv4(),
      productId: uuidv4(),
      ticketName: "Ticket 1",
      eventName: "Event 1",
      ticketSecret: "secret123",
      timestampConsumed: 1714857600,
      timestampSigned: 1714857600,
      attendeeSemaphoreId: identityV3.getCommitment(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      owner: encodePublicKey(identityV4.publicKey),
      isConsumed: 0,
      isRevoked: 0,
      ticketCategory: 0,
      attendeeName: "John Doe",
      attendeeEmail: "test@example.com"
    };

    const result = TicketSpec.safeParseEntries(ticketData, {
      coerce: true
    });
    assert(result.isValid);
    const podEntries = result.value;
    expect(Object.keys(podEntries)).toEqual([
      "ticketId",
      "eventId",
      "productId",
      "ticketName",
      "eventName",
      "ticketSecret",
      "timestampConsumed",
      "timestampSigned",
      "attendeeSemaphoreId",
      "owner",
      "isConsumed",
      "isRevoked",
      "ticketCategory",
      "attendeeName",
      "attendeeEmail"
    ]);
  });

  it("should create a ticket proof", () => {
    const request = ticketProofRequest({
      classificationTuples: [],
      fieldsToReveal: {},
      externalNullifier: { type: "string", value: "1" },
      watermark: { type: "string", value: "1" }
    });

    const proofRequest = request.getProofRequest();
    expect(proofRequest.externalNullifier).toEqual({
      type: "string",
      value: "1"
    });
    expect(proofRequest.watermark).toEqual({
      type: "string",
      value: "1"
    });
    expect(Object.keys(proofRequest.membershipLists)).toHaveLength(0);
    expect(proofRequest.proofConfig.pods.ticket).toBeDefined();
    // The owner entry is present because we specified an external nullifier
    expect(
      Object.keys(proofRequest.proofConfig.pods.ticket?.entries ?? {})
    ).toHaveLength(1);
    expect(proofRequest.proofConfig.pods.ticket?.entries?.owner).toEqual({
      isOwnerID: "SemaphoreV4",
      isRevealed: false
    });
  });
});
