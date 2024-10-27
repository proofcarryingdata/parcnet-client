import { gpcProve } from "@pcd/gpc";
import { POD } from "@pcd/pod";
import { Identity } from "@semaphore-protocol/identity";
import { v4 as uuidv4 } from "uuid";
import { assert, describe, expect, it } from "vitest";
import * as p from "../src/index.js";
import { $s } from "../src/pod_value_utils.js";
import { GPC_NPM_ARTIFACTS_PATH } from "./constants.js";
import { generateKeyPair } from "./utils.js";

/**
 * A specification for tickets, based on the existing example in the Zupass codebase.
 */
const TicketEntries = p.entries({
  ticketId: { type: "string" },
  eventId: { type: "string" },
  productId: { type: "string" },
  ticketName: { type: "string" },
  eventName: { type: "string" },
  checkerEmail: { type: "optional", innerType: { type: "string" } },
  imageUrl: { type: "optional", innerType: { type: "string" } },
  imageAltText: { type: "optional", innerType: { type: "string" } },
  ticketSecret: { type: "optional", innerType: { type: "string" } },
  timestampConsumed: { type: "int" },
  timestampSigned: { type: "int" },
  attendeeSemaphoreId: { type: "cryptographic" },
  isConsumed: { type: "int" },
  isRevoked: { type: "int" },
  ticketCategory: { type: "string" },
  attendeeName: { type: "string" },
  attendeeEmail: { type: "string" }
});

// An event ID for an event
const MY_EVENT_ID = uuidv4();
// Possible product IDs for the event
const MY_EVENT_PRODUCT_IDS = {
  VISITOR: uuidv4(),
  RESIDENT: uuidv4(),
  ORGANIZER: uuidv4()
};

// Example data for a ticket
const VALID_TICKET_DATA = {
  ticketId: uuidv4(),
  eventId: MY_EVENT_ID,
  productId: MY_EVENT_PRODUCT_IDS.VISITOR,
  ticketName: "Ticket 1",
  eventName: "Event 1",
  checkerEmail: "checker@example.com",
  imageUrl: "https://example.com/image.jpg",
  imageAltText: "Image 1",
  ticketSecret: "secret123",
  timestampConsumed: 1714857600,
  timestampSigned: 1714857600,
  attendeeSemaphoreId: 1234567890,
  isConsumed: 0,
  isRevoked: 0,
  ticketCategory: "Category 1",
  attendeeName: "John Doe",
  attendeeEmail: "john.doe@example.com"
};

describe.concurrent("podspec ticket example", function () {
  // Given a ticket with valid data, it should be recognized as valid
  it("should validate ticket entries", async function () {
    const result = TicketEntries.safeParse(VALID_TICKET_DATA, { coerce: true });
    expect(result.isValid).toBe(true);
  });

  // Validation of a POD should work
  it("should validate ticket PODs", async function () {
    const { privateKey } = generateKeyPair();
    const entries = TicketEntries.parse(VALID_TICKET_DATA, { coerce: true });
    const pod = POD.sign(entries, privateKey);

    const podSpec = p.pod({ entries: TicketEntries.schema });

    const result = podSpec.safeParse(pod);
    expect(result.isValid).toBe(true);
    assert(result.isValid);
  });

  // Given that we have a schema for tickets, we should be able to create
  // narrower schemas for specific events or products, re-using our existing
  // specification.
  it("should support narrowing of ticket criteria", async function () {
    const baseTicketSchema = TicketEntries.schema;

    // Override the event ID to be specific to our event
    const EventSpecificTicketEntries = p.entries({
      ...baseTicketSchema,
      eventId: { ...baseTicketSchema.eventId, isMemberOf: $s([MY_EVENT_ID]) }
    });

    // This will succeed because the ticket is for the specified event
    const result = EventSpecificTicketEntries.safeParse(VALID_TICKET_DATA, {
      coerce: true
    });

    expect(result.isValid).toBe(true);
  });

  it("should reject tickets which do not meet criteria", async function () {
    const baseTicketSchema = TicketEntries.schema;

    // Now let's create a specification for a ticket which only matches tickets
    // with two specific product IDs
    const EventAndProductSpecificTicketEntries = p.entries({
      ...baseTicketSchema,
      eventId: { ...baseTicketSchema.eventId, isMemberOf: $s([MY_EVENT_ID]) },
      productId: {
        ...baseTicketSchema.productId,
        isMemberOf: $s([
          // Ticket is of type "VISITOR", so neither of these match
          MY_EVENT_PRODUCT_IDS.RESIDENT,
          MY_EVENT_PRODUCT_IDS.ORGANIZER
        ])
      }
    });

    // This will fail because the ticket is of type "VISITOR", which is not in
    // the list of allowed product IDs
    const result = EventAndProductSpecificTicketEntries.safeParse(
      VALID_TICKET_DATA,
      {
        coerce: true
      }
    );

    assert(result.isValid === false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.code).toBe("not_in_list");
    expect(result.issues[0]?.path).toEqual(["productId"]);
  });

  // Given a collection of tickets, we should be able to query for tickets which
  // match a given criteria
  it("should be able to find matching tickets from a collection", async function () {
    const { privateKey } = generateKeyPair();
    const entries = TicketEntries.parse(VALID_TICKET_DATA, { coerce: true });
    const visitorPod = POD.sign(entries, privateKey);
    const organizerPod = POD.sign(
      { ...entries, productId: $s(MY_EVENT_PRODUCT_IDS.ORGANIZER) },
      privateKey
    );
    const residentPod = POD.sign(
      { ...entries, productId: $s(MY_EVENT_PRODUCT_IDS.RESIDENT) },
      privateKey
    );
    const differentEventPod = POD.sign(
      { ...entries, eventId: $s(uuidv4()) },
      privateKey
    );
    const otherPod = POD.sign({ test: $s("I'm not a ticket") }, privateKey);
    const pods = [
      visitorPod,
      organizerPod,
      residentPod,
      differentEventPod,
      otherPod
    ];

    // Create a podspec which matches all tickets
    const allTicketsPodSpec = p.pod({ entries: TicketEntries.schema });
    {
      const { matches, matchingIndexes } = allTicketsPodSpec.query(pods);
      expect(matches).toHaveLength(4);
      // We match the tickets, but not `otherPod`
      expect(matchingIndexes).to.eql([0, 1, 2, 3]);
    }

    // Create a new podspec which only matches tickets for our event
    const eventTicketsPodSpec = allTicketsPodSpec.extend((s, f) =>
      f({
        ...s,
        entries: {
          ...s.entries,
          eventId: { ...s.entries.eventId, isMemberOf: $s([MY_EVENT_ID]) }
        }
      })
    );

    {
      const { matches, matchingIndexes } = eventTicketsPodSpec.query(pods);
      expect(matches).toHaveLength(3);
      // We match the tickets for our event, but not the other tickets or `otherPod`
      expect(matchingIndexes).to.eql([0, 1, 2]);
    }

    // Extend our event-specific ticket spec to only match tickets of type "VISITOR"
    const visitorTicketsPodSpec = eventTicketsPodSpec.extend((s, f) =>
      f({
        ...s,
        entries: {
          ...s.entries,
          productId: {
            ...s.entries.productId,
            isMemberOf: $s([MY_EVENT_PRODUCT_IDS.VISITOR])
          }
        }
      })
    );

    {
      const { matches, matchingIndexes } = visitorTicketsPodSpec.query(pods);
      expect(matches).toHaveLength(1);
      // We only match the ticket of type "VISITOR"
      expect(matchingIndexes).to.eql([0]);
    }

    const organizerTicketsPodSpec = eventTicketsPodSpec.extend((s, f) =>
      f({
        ...s,
        entries: {
          ...s.entries,
          productId: {
            ...s.entries.productId,
            isMemberOf: $s([MY_EVENT_PRODUCT_IDS.ORGANIZER])
          }
        }
      })
    );

    {
      const { matches, matchingIndexes } = organizerTicketsPodSpec.query(pods);
      expect(matches).toHaveLength(1);
      // We only match the ticket of type "ORGANIZER"
      expect(matchingIndexes).to.eql([1]);
    }
  });

  it("should be able to generate a proof request for a podspec", async function () {
    // Create a podspec which matches all tickets
    const allTicketsPodSpec = p.pod({ entries: TicketEntries.schema });

    // Create a new podspec which only matches tickets for our event
    const eventTicketsPodSpec = allTicketsPodSpec.extend((s, f) =>
      f({
        ...s,
        entries: {
          ...s.entries,
          eventId: { ...s.entries.eventId, isMemberOf: $s([MY_EVENT_ID]) }
        }
      })
    );

    const identity = new Identity();

    // Turn our JavaScript data into PODEntries
    const ticketEntries = TicketEntries.parse(
      {
        ...VALID_TICKET_DATA,
        attendeeSemaphoreId: identity.commitment
      },
      { coerce: true }
    );

    // Create the POD
    const ticketPod = POD.sign(ticketEntries, generateKeyPair().privateKey);

    const proofRequestSpec = p.proofRequest({
      pods: {
        // Create proof config for the ticket POD, specific to our event
        ticketPod: eventTicketsPodSpec.proofConfig({
          revealed: { ticketId: true },
          owner: { entry: "attendeeSemaphoreId", protocol: "SemaphoreV3" }
        })
      }
    });

    // Get a proof request
    const req = proofRequestSpec.getProofRequest();

    // There's a membership list check on event ID, so the proof request should
    // have a membership list for it
    expect(req.membershipLists.allowlist_ticketPod_eventId).toHaveLength(1);
    // The membership list should contain the event ID
    expect(req.membershipLists.allowlist_ticketPod_eventId?.[0]).toEqual(
      $s(MY_EVENT_ID)
    );
    // The ticket ID is revealed
    expect(req.proofConfig.pods.ticketPod?.entries.ticketId?.isRevealed).toBe(
      true
    );
    // The event ID is not revealed
    expect(req.proofConfig.pods.ticketPod?.entries.eventId?.isRevealed).toBe(
      false
    );
    // The event ID does have a membership list
    expect(req.proofConfig.pods.ticketPod?.entries.eventId?.isMemberOf).toBe(
      "allowlist_ticketPod_eventId"
    );
    // The product ID is not defined, because it has no GPC checks and is not
    // revealed
    expect(req.proofConfig.pods.ticketPod?.entries.productId).toBeUndefined();
    // There are three configured entries, event ID, ticket ID, and the
    // attendee's Semaphore ID (which is the owner)
    expect(
      Object.keys(req.proofConfig.pods.ticketPod?.entries ?? {})
    ).toHaveLength(3);

    const result = await gpcProve(
      req.proofConfig,
      {
        pods: {
          ticketPod
        },
        membershipLists: req.membershipLists,
        watermark: req.watermark,
        owner: {
          semaphoreV3: identity
        }
      },
      GPC_NPM_ARTIFACTS_PATH
    );

    expect(result).toBeDefined();
    expect(result.proof).toBeDefined();
    expect(result.boundConfig).toBeDefined();
    expect(result.revealedClaims).toBeDefined();
    expect(
      result.revealedClaims.pods.ticketPod?.entries?.ticketId
    ).toBeDefined();
  });
});
