import * as p from "@parcnet-js/podspec";

/**
 * Specifies the entries that a ticket POD should have.
 */
export const TicketSpec = p.pod({
  entries: {
    ticketId: { type: "string" },
    eventId: { type: "string" },
    productId: { type: "string" },
    ticketName: { type: "string" },
    eventName: { type: "string" },
    timestampConsumed: { type: "optional", innerType: { type: "int" } },
    timestampSigned: { type: "int" },
    // Semaphore v3
    attendeeSemaphoreId: {
      type: "optional",
      innerType: { type: "cryptographic" }
    },
    // Semaphore v4
    owner: { type: "eddsa_pubkey" },
    isConsumed: { type: "int" },
    isRevoked: { type: "optional", innerType: { type: "int" } },
    ticketCategory: { type: "optional", innerType: { type: "int" } },
    attendeeName: { type: "string" },
    attendeeEmail: { type: "string" },
    checkerEmail: { type: "optional", innerType: { type: "string" } },
    imageUrl: { type: "optional", innerType: { type: "string" } },
    imageAltText: { type: "optional", innerType: { type: "string" } },
    ticketSecret: { type: "optional", innerType: { type: "string" } }
  },
  meta: {
    labelEntry: "eventName"
  }
});
