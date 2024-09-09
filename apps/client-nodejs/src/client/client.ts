import { ConnectorAdvice } from "@parcnet/client-helpers";
import {
  ParcnetGPCRPC,
  ParcnetIdentityRPC,
  ParcnetPODRPC,
  ParcnetRPC
} from "@parcnet/client-rpc";
import { ParcnetIdentityProcessor } from "./identity.js";
import { ParcnetPODProcessor } from "./pod.js";
import { PODCollection } from "./pod_collection.js";
import { QuerySubscriptions } from "./query_subscriptions.js";

export class ParcnetClientProcessor implements ParcnetRPC {
  _version: "1" = "1" as const;
  private readonly pods: PODCollection;
  private readonly subscriptions: QuerySubscriptions;
  public readonly identity: ParcnetIdentityRPC;
  public readonly pod: ParcnetPODRPC;
  public readonly gpc: ParcnetGPCRPC;

  public constructor(public readonly clientChannel: ConnectorAdvice) {
    this.pods = new PODCollection();
    this.subscriptions = new QuerySubscriptions(this.pods);
    this.subscriptions.onSubscriptionUpdated((update, serial) => {
      this.clientChannel.subscriptionUpdate(update, serial);
    });
    this.pod = new ParcnetPODProcessor(this.pods, this.subscriptions);
    this.identity = new ParcnetIdentityProcessor();
    // @todo: implement gpc
    this.gpc = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prove: (_: any): any => {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      verify: (_: any): any => {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canProve: (_: any): any => {}
    };
  }
}
