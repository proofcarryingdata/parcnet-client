import * as p from "@parcnet-js/podspec";
import { $e, $s } from "@parcnet-js/podspec/pod_value_utils";
import type { PODValue } from "@pcd/pod";
import { TicketSpec } from "./ticket_spec.js";

/**
 * Specifies the fields that can be revealed in a GPC proof.
 */
interface FieldsToReveal {
  ticketId: boolean;
  eventId: boolean;
  productId: boolean;
  ticketName: boolean;
  eventName: boolean;
  checkerEmail: boolean;
  imageUrl: boolean;
  imageAltText: boolean;
  ticketSecret: boolean;
  timestampConsumed: boolean;
  timestampSigned: boolean;
  isConsumed: boolean;
  isRevoked: boolean;
  ticketCategory: boolean;
  attendeeName: boolean;
  attendeeEmail: boolean;
  owner: boolean;
}

/**
 * An array of tuples of a public key and an event ID.
 */
export type PublicKeyAndEventIdTuples = {
  signerPublicKey: string;
  eventId: string;
}[];

/**
 * An array of tuples of a public key, an event ID, and a product ID.
 */
export type PublicKeyAndEventIdAndProductIdTuples = {
  signerPublicKey: string;
  eventId: string;
  productId: string;
}[];

export type TicketClassificationTuples =
  | PublicKeyAndEventIdTuples
  | PublicKeyAndEventIdAndProductIdTuples;

export interface TicketProofRequest {
  classificationTuples: TicketClassificationTuples;
  fieldsToReveal: Partial<FieldsToReveal> & Record<string, boolean>;
  externalNullifier?: PODValue;
  watermark?: PODValue;
}

function isPublicKeyAndEventIdTuples(
  a: TicketClassificationTuples
): a is PublicKeyAndEventIdTuples {
  return a.length > 0 && a.every((tuple) => Object.keys(tuple).length === 2);
}

function isPublicKeyAndEventIdAndProductIdTuples(
  a: TicketClassificationTuples
): a is PublicKeyAndEventIdAndProductIdTuples {
  return a.length > 0 && a.every((tuple) => Object.keys(tuple).length === 3);
}

/**
 * Create a ticket proof request.
 * @param request - Inputs for the ticket proof request.
 * @returns The ticket proof request.
 */
export function ticketProofRequest({
  classificationTuples,
  fieldsToReveal,
  externalNullifier,
  watermark
}: TicketProofRequest) {
  const podConfig = TicketSpec.extend((schema, f) => {
    return f({
      ...schema,
      tuples: isPublicKeyAndEventIdAndProductIdTuples(classificationTuples)
        ? [
            {
              entries: ["$signerPublicKey", "eventId", "productId"],
              isMemberOf: classificationTuples.map(
                ({ signerPublicKey, eventId, productId }) => [
                  $e(signerPublicKey),
                  $s(eventId),
                  $s(productId)
                ]
              )
            }
          ]
        : isPublicKeyAndEventIdTuples(classificationTuples)
          ? [
              {
                entries: ["$signerPublicKey", "eventId"],
                isMemberOf: classificationTuples.map(
                  ({ signerPublicKey, eventId }) => [
                    $e(signerPublicKey),
                    $s(eventId)
                  ]
                )
              }
            ]
          : []
    });
  }).proofConfig({
    revealed: fieldsToReveal,
    owner: { entry: "owner", protocol: "SemaphoreV4" }
  });

  return p.proofRequest({
    pods: { ticket: podConfig },
    externalNullifier,
    watermark
  });
}
