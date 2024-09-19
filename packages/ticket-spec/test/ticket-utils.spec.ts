import { encodePublicKey } from "@pcd/pod";
import { Identity as IdentityV4 } from "@semaphore-protocol/core/identity";
import { Identity as IdentityV3 } from "@semaphore-protocol/identity";
import { v4 as uuidv4 } from "uuid";
import { describe, expect, it } from "vitest";
import { assert } from "vitest";
import { TicketSpec } from "../src/index.js";

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
});
