# Ticket Spec

Provides a [PodSpec](https://www.npmjs.com/package/@parcnet-js/podspec) schema for tickets in Zupass.

## Installation

Install the package:

Using npm:

    npm install @parcnet-js/ticket-spec

Using yarn:

    yarn add @parcnet-js/ticket-spec

Using pnpm:

    pnpm add @parcnet-js/ticket-spec

## Usage

This package has two main exports: the `TicketSpec` object, and the `ticketProofRequest` function.

The `TicketSpec` object describes a ticket POD and can be used to validate a POD, query a POD collection, or transform suitable JavaScript objects to POD entries:

```ts
import { TicketSpec } from "@parcnet-js/ticket-spec";

const somePod = { /* a POD from some external source */ };
const result = TicketSpec.safeParse(somePod);
if (result.isValid) {
  // somePod is a valid Ticket POD
}

const pods: POD[] = [/* PODs from some external source */];
// Find the Ticket PODs in the collection:
const ticketPods = TicketSpec.query(pods);

const ticketData = {
  ticketName: "My ticket",
  attendeeName: "John Doe",
  // ... other ticket data
};
const result = TicketSpec.safeParseEntries(ticketData, { coerce: true });
if (result.isValid) {
  // result.value contains PODEntries for a Ticket POD, ready to be signed
}
```

Often we care about tickets for specific events, rather than tickets in general. In this case, we can extend the TicketSpec object by constraining the valid values for entries like `eventId`. For example, if we want to match on a primary Devcon ticket, we could extend TicketSpec as follows:

```ts
const DevconTicketSpec = TicketSpec.extend((schema, f) => {
  return f({
    ...schema,
    entries: {
      // Include all of the regular ticket entries:
      ...schema.entries,
      // Make sure the ticket is for the Devcon event:
      eventId: {
        type: "string",
        isMemberOf: [
          { type: "string", value: "5074edf5-f079-4099-b036-22223c0c6995" },
        ],
      },
      // To target the user's main Devcon ticket, we exclude add-on (swag) tickets.
      // This rule excludes tickets which have an `isAddon` entry with a value of `1`.
      isAddon: {
        type: "optional",
        innerType: {
          type: "int",
          isNotMemberOf: [{ type: "int", value: BigInt(1) }],
        },
      },
    },
    signerPublicKey: {
      // Must be the Devcon ticket issuance public key
      isMemberOf: ["YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs"],
    },
  });
});
```

You can now use `DevconTicketSpec` in place of the plain `TicketSpec`, and it will perform the same operations: validating that a ticket is a Devcon ticket, finding a Devcon ticket from a collection, and turning JavaScript data into Devcon ticket entries.