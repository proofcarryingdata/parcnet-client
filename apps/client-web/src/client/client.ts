import {
  ParcnetGPCRPC,
  ParcnetIdentityRPC,
  ParcnetPODRPC,
  ParcnetRPC
} from "@parcnet/client-rpc";
import { ConnectorAdvice } from "@parcnet/client/dist/connection/advice.js";
import { ParcnetIdentityServer } from "./identity.js";
import { ParcnetPODServer } from "./pod.js";
import { PODCollection } from "./pod_collection.js";

export class ParcnetClientProcessor implements ParcnetRPC {
  _version: "1" = "1" as const;
  private readonly pods: PODCollection;
  public readonly identity: ParcnetIdentityRPC;
  public readonly pod: ParcnetPODRPC;
  public readonly gpc: ParcnetGPCRPC;

  public constructor(public readonly clientChannel: ConnectorAdvice) {
    this.pods = new PODCollection();
    this.pod = new ParcnetPODServer(this.pods);
    this.identity = new ParcnetIdentityServer();
    // @todo: implement gpc
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    this.gpc = { prove: (_: any): any => {}, verify: (_: any): any => {} };
  }
}
