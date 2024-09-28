import type { PODData, SubscriptionUpdateResult } from "@parcnet-js/client-rpc";
import * as p from "@parcnet-js/podspec";
import type { EntriesSchema, PODSchema, PodSpec } from "@parcnet-js/podspec";
import { EventEmitter } from "eventemitter3";
import type { PODCollection } from "./pod_collection.js";
import { podToPODData } from "./utils.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Subscription<E extends EntriesSchema = any> {
  query: PodSpec<E>;
  serial: number;
}

interface QuerySubscriptionEvents {
  "query-update": [results: SubscriptionUpdateResult, serial: number];
}

export class QuerySubscriptions {
  private subscriptions = new Map<string, Subscription>();
  private emitter = new EventEmitter<QuerySubscriptionEvents>();
  private nextSubscriptionId = 0;

  constructor(private readonly pods: PODCollection) {
    this.pods.onUpdate((update) => {
      if (update.type === "delete") {
        for (const [id, sub] of this.subscriptions.entries()) {
          const result = sub.query.query([podToPODData(update.affectedPOD)]);
          if (result.matches.length > 0) {
            this.emitter.emit(
              "query-update",
              {
                update: sub.query.query(this.pods.getAll().map(podToPODData))
                  .matches as PODData[],
                subscriptionId: id
              },
              sub.serial
            );
            sub.serial++;
          }
        }
      } else if (update.type === "insert") {
        for (const [id, sub] of this.subscriptions.entries()) {
          const result = sub.query.query([podToPODData(update.affectedPOD)]);
          if (result.matches.length > 0) {
            this.emitter.emit(
              "query-update",
              {
                update: sub.query.query(this.pods.getAll().map(podToPODData))
                  .matches as PODData[],
                subscriptionId: id
              },
              sub.serial
            );
            sub.serial++;
          }
        }
      }
    });
  }

  public async subscribe<E extends EntriesSchema>(
    query: PODSchema<E>
  ): Promise<string> {
    const subscriptionId = (this.nextSubscriptionId++).toString();
    this.subscriptions.set(subscriptionId, {
      query: p.pod(query),
      serial: 0
    });

    return subscriptionId;
  }

  public unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  public onSubscriptionUpdated(
    listener: (results: SubscriptionUpdateResult, serial: number) => void
  ): void {
    this.emitter.addListener("query-update", listener);
  }
}
