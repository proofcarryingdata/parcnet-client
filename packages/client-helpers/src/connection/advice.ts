import type {
  ParcnetRPC,
  SubscriptionUpdateResult
} from "@parcnet-js/client-rpc";

/**
 * ConnectorAdvice is a set of methods that a client can call to advise the
 * connector about the client's state, specifically that the client requests
 * visibility for user interaction.
 *
 * In the case of a client embedded in an iframe, the connector may respond by
 * showing or hiding the iframe. For other kinds of clients, the connector may
 * respond differently, e.g. by displaying a message to the user telling them
 * to interact with the client via some other UI.
 */
export interface ConnectorAdvice {
  showClient(): void;
  hideClient(): void;
  ready(rpc: ParcnetRPC): void;
  subscriptionUpdate(
    result: SubscriptionUpdateResult,
    subscriptionSerial: number
  ): void;
  cancel(): void;
}
