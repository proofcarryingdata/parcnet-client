import type { ConnectorAdvice } from "@parcnet-js/client-helpers";
import type {
  ParcnetGPCRPC,
  ParcnetIdentityRPC,
  ParcnetPODRPC,
  ParcnetRPC
} from "@parcnet-js/client-rpc";
import type { Identity } from "@semaphore-protocol/identity";
import type { Dispatch } from "react";
import type { ClientAction } from "../state.js";
import { ParcnetGPCProcessor } from "./gpc.js";
import { ParcnetIdentityProcessor } from "./identity.js";
import { ParcnetPODProcessor } from "./pod.js";
import type { PODCollection } from "./pod_collection.js";
import { QuerySubscriptions } from "./query_subscriptions.js";

export class ParcnetClientProcessor implements ParcnetRPC {
  _version: "1" = "1" as const;
  private readonly subscriptions: QuerySubscriptions;
  public readonly identity: ParcnetIdentityRPC;
  public readonly pod: ParcnetPODRPC;
  public readonly gpc: ParcnetGPCRPC;

  public constructor(
    public readonly clientChannel: ConnectorAdvice,
    private readonly pods: PODCollection,
    dispatch: Dispatch<ClientAction>,
    userIdentity: Identity
  ) {
    this.subscriptions = new QuerySubscriptions(this.pods);
    this.subscriptions.onSubscriptionUpdated((update, serial) => {
      this.clientChannel.subscriptionUpdate(update, serial);
    });
    this.pod = new ParcnetPODProcessor(
      this.pods,
      this.subscriptions,
      userIdentity
    );
    this.identity = new ParcnetIdentityProcessor();
    this.gpc = new ParcnetGPCProcessor(this.pods, dispatch, this.clientChannel);
  }
}
