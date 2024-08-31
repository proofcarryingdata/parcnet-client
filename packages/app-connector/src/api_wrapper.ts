import { ParcnetIdentityRPC, ParcnetRPC } from "@parcnet/client-rpc";
import { GPCPCD, GPCPCDArgs, GPCPCDPackage } from "@pcd/gpc-pcd";
import { POD } from "@pcd/pod";
import { p } from "@pcd/podspec";
import { EventEmitter } from "eventemitter3";
import { ParcnetRPCConnector } from "./rpc_client.js";

type QueryType = ReturnType<typeof p.pod>;

/**
 * A Subscription object is returned to the caller when a subscription is
 * created. It allows the caller to attach event listeners to the subscription
 * to get updates when the PODs change.
 *
 * It also allows the caller to run the query immediately, which is useful on
 * first creating the subscription, before any updates are available.
 */
export class Subscription {
  #emitter: EventEmitter;
  #query: QueryType;
  #api: ParcnetPODWrapper;

  constructor(query: QueryType, emitter: EventEmitter, api: ParcnetPODWrapper) {
    this.#emitter = emitter;
    this.#query = query;
    this.#api = api;
  }

  async query(): Promise<POD[]> {
    return this.#api.query(this.#query);
  }

  on(event: "update", callback: (result: POD[]) => void): void {
    this.#emitter.on(event, callback);
  }

  off(event: "update", callback: (result: POD[]) => void): void {
    this.#emitter.off(event, callback);
  }
}

class ParcnetPODWrapper {
  #api: ParcnetRPCConnector;
  #subscriptionEmitters: Map<string, EventEmitter>;

  constructor(api: ParcnetRPCConnector) {
    this.#api = api;
    this.#subscriptionEmitters = new Map();
    this.#api.on("subscription-update", (result) => {
      const emitter = this.#subscriptionEmitters.get(result.subscriptionId);
      if (emitter) {
        emitter.emit(
          "update",
          result.update.map((pod) => POD.deserialize(pod))
        );
      }
    });
  }

  async query(query: QueryType): Promise<POD[]> {
    const serialized = query.serialize();
    const pods = await this.#api.pod.query(serialized);
    return pods.map((pod) => POD.deserialize(pod));
  }

  async subscribe(query: QueryType): Promise<Subscription> {
    const serialized = query.serialize();
    const subscriptionId = await this.#api.pod.subscribe(serialized);
    const emitter = new EventEmitter();
    const subscription = new Subscription(query, emitter, this);
    this.#subscriptionEmitters.set(subscriptionId, emitter);
    return subscription;
  }

  async insert(pod: POD): Promise<void> {
    const serialized = pod.serialize();
    return this.#api.pod.insert(serialized);
  }

  async delete(signature: string): Promise<void> {
    return this.#api.pod.delete(signature);
  }
}

class ParcnetGPCWrapper {
  #api: ParcnetRPC;

  constructor(api: ParcnetRPC) {
    this.#api = api;
  }

  // In a world with POD2, we would use new POD2 types rather than GPCPCD.
  // The existing args system and GPC wrapper works well, so we can use that.
  async prove(args: GPCPCDArgs): Promise<GPCPCD> {
    const serialized = await this.#api.gpc.prove(args);
    return GPCPCDPackage.deserialize(serialized.pcd);
  }

  async verify(pcd: GPCPCD): Promise<boolean> {
    const serialized = await GPCPCDPackage.serialize(pcd);
    return this.#api.gpc.verify(serialized);
  }
}

/**
 * Wraps the Parcnet RPC API to provide a more user-friendly interface.
 * Specifically, this handles serialization and deserialization of PODs and
 * query data.
 */
export class ParcnetAPI {
  #api: ParcnetRPCConnector;
  public pod: ParcnetPODWrapper;
  public identity: ParcnetIdentityRPC;
  public gpc: ParcnetGPCWrapper;

  constructor(api: ParcnetRPCConnector) {
    this.#api = api;
    this.pod = new ParcnetPODWrapper(api);
    this.identity = api.identity;
    this.gpc = new ParcnetGPCWrapper(api);
  }
}
