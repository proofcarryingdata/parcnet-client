import type {
  PODData,
  ParcnetIdentityRPC,
  ParcnetRPC,
  ProveResult
} from "@parcnet-js/client-rpc";
import type * as p from "@parcnet-js/podspec";
import type {
  GPCBoundConfig,
  GPCIdentifier,
  GPCProof,
  GPCRevealedClaims
} from "@pcd/gpc";
import type { PODEntries } from "@pcd/pod";
import { type Emitter, createNanoEvents } from "nanoevents";
import type { ModalEmitter } from "./adapters/iframe.js";
import { UserClosedDialogError } from "./errors.js";
import type { ParcnetRPCConnector } from "./rpc_client.js";

type SubscriptionEvents = {
  update: (result: PODData[]) => void;
};

/**
 * A Subscription object is returned to the caller when a subscription is
 * created. It allows the caller to attach event listeners to the subscription
 * to get updates when the PODs change.
 *
 * It also allows the caller to run the query immediately, which is useful on
 * first creating the subscription, before any updates are available.
 */
export class Subscription<E extends p.EntriesSchema> {
  #emitter: Emitter<SubscriptionEvents>;
  #query: p.PodSpec<E>;
  #api: ParcnetPODCollectionWrapper;

  constructor(
    query: p.PodSpec<E>,
    emitter: Emitter<SubscriptionEvents>,
    api: ParcnetPODCollectionWrapper
  ) {
    this.#emitter = emitter;
    this.#query = query;
    this.#api = api;
  }

  async query(): Promise<PODData[]> {
    return this.#api.query(this.#query);
  }

  on(event: "update", callback: (result: PODData[]) => void): () => void {
    return this.#emitter.on(event, callback);
  }
}

export class ParcnetPODCollectionWrapper {
  #api: ParcnetRPCConnector;
  #collectionId: string;
  #subscriptionEmitters: Map<string, Emitter<SubscriptionEvents>>;
  #unloadProtector: MutationUnloadProtector;

  constructor(
    api: ParcnetRPCConnector,
    collectionId: string,
    unloadProtector: MutationUnloadProtector
  ) {
    this.#api = api;
    this.#collectionId = collectionId;
    this.#subscriptionEmitters = new Map();
    this.#unloadProtector = unloadProtector;
    this.#api.on("subscription-update", (update) => {
      this.#subscriptionEmitters
        .get(update.subscriptionId)
        ?.emit("update", update.update);
    });
  }

  async query<E extends p.EntriesSchema>(
    query: p.PodSpec<E>
  ): Promise<PODData[]> {
    return this.#api.pod.query(this.#collectionId, query.schema);
  }

  async subscribe<E extends p.EntriesSchema>(
    query: p.PodSpec<E>
  ): Promise<Subscription<E>> {
    const subscriptionId = await this.#api.pod.subscribe(
      this.#collectionId,
      query.schema
    );
    const emitter = createNanoEvents<SubscriptionEvents>();
    const subscription = new Subscription(query, emitter, this);
    this.#subscriptionEmitters.set(subscriptionId, emitter);
    return subscription;
  }

  async insert(podData: PODData): Promise<void> {
    return this.#unloadProtector.add(
      this.#api.pod.insert(this.#collectionId, podData)
    );
  }

  async delete(signature: string): Promise<void> {
    return this.#unloadProtector.add(
      this.#api.pod.delete(this.#collectionId, signature)
    );
  }
}

/**
 * This class is used to prevent the page from being unloaded while there are
 * pending mutations.
 */
class MutationUnloadProtector {
  #mutations = new Set<Promise<unknown>>();

  public constructor() {
    window.addEventListener("beforeunload", (event: BeforeUnloadEvent) => {
      if (this.#mutations.size > 0) {
        event.preventDefault();
      }
    });
  }

  public add<T>(mutation: Promise<T>): Promise<T> {
    this.#mutations.add(mutation);
    void mutation.finally(() => {
      this.#mutations.delete(mutation);
    });
    return mutation;
  }
}

export class ParcnetPODWrapper {
  #api: ParcnetRPCConnector;
  #modalEmitter: ModalEmitter;
  #unloadProtector: MutationUnloadProtector = new MutationUnloadProtector();

  constructor(api: ParcnetRPCConnector, modalEmitter: ModalEmitter) {
    this.#api = api;
    this.#modalEmitter = modalEmitter;
  }

  collection(collectionId: string): ParcnetPODCollectionWrapper {
    return new ParcnetPODCollectionWrapper(
      this.#api,
      collectionId,
      this.#unloadProtector
    );
  }

  async sign(entries: PODEntries): Promise<PODData> {
    return new Promise((resolve, reject) => {
      const unsub = this.#modalEmitter.on("close", () => {
        unsub();
        // The dialog could be closing because the operation succeeded, so we
        // want to wait before rejecting the promise to allow for successful
        // resolution.
        window.setTimeout(() => reject(new UserClosedDialogError()), 500);
      });
      this.#api.pod.sign(entries).then(resolve).catch(reject);
    });
  }

  async signPrefixed(entries: PODEntries): Promise<PODData> {
    return this.#api.pod.signPrefixed(entries);
  }
}

/**
 * Wraps the Parcnet RPC API to provide a more user-friendly interface.
 */
export class ParcnetGPCWrapper {
  #api: ParcnetRPC;
  #modalEmitter: ModalEmitter;

  constructor(api: ParcnetRPC, modalEmitter: ModalEmitter) {
    this.#api = api;
    this.#modalEmitter = modalEmitter;
  }

  async prove(args: {
    request: p.PodspecProofRequest;
    circuitIdentifier?: GPCIdentifier;
    collectionIds?: string[];
  }): Promise<ProveResult> {
    return new Promise((resolve, reject) => {
      const unsub = this.#modalEmitter.on("close", () => {
        unsub();
        // The dialog could be closing because the operation succeeded, so we
        // want to wait before rejecting the promise to allow for successful
        // resolution.
        window.setTimeout(() => reject(new UserClosedDialogError()), 500);
      });
      this.#api.gpc.prove(args).then(resolve).catch(reject);
    });
  }

  async verify(
    proof: GPCProof,
    config: GPCBoundConfig,
    revealedClaims: GPCRevealedClaims
  ): Promise<boolean> {
    return this.#api.gpc.verify(proof, config, revealedClaims);
  }

  async verifyWithProofRequest(
    proof: GPCProof,
    config: GPCBoundConfig,
    revealedClaims: GPCRevealedClaims,
    proofRequest: p.PodspecProofRequest
  ): Promise<boolean> {
    return this.#api.gpc.verifyWithProofRequest(
      proof,
      config,
      revealedClaims,
      proofRequest
    );
  }
}

export class ParcnetIdentityWrapper {
  #api: ParcnetIdentityRPC;

  constructor(api: ParcnetIdentityRPC) {
    this.#api = api;
  }

  async getPublicKey(): Promise<string> {
    return this.#api.getPublicKey();
  }

  async getSemaphoreV3Commitment(): Promise<bigint> {
    return this.#api.getSemaphoreV3Commitment();
  }

  async getSemaphoreV4Commitment(): Promise<bigint> {
    return this.#api.getSemaphoreV4Commitment();
  }
}

/**
 * Wraps the Parcnet RPC API to provide a more user-friendly interface.
 * Specifically, this handles serialization and deserialization of PODs and
 * query data.
 */
export class ParcnetAPI {
  public pod: ParcnetPODWrapper;
  public identity: ParcnetIdentityWrapper;
  public gpc: ParcnetGPCWrapper;

  constructor(api: ParcnetRPCConnector, modalEmitter: ModalEmitter) {
    this.pod = new ParcnetPODWrapper(api, modalEmitter);
    this.identity = new ParcnetIdentityWrapper(api.identity);
    this.gpc = new ParcnetGPCWrapper(api, modalEmitter);
  }
}
