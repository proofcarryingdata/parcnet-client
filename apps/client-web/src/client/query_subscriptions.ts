import { SubscriptionUpdateResult } from "@parcnet/client-rpc";
import { EntriesSchema, PodSpec } from "@parcnet/podspec";
import { EventEmitter } from "eventemitter3";
import { PODCollection } from "./pod_collection";

interface Subscription {
  query: PodSpec<EntriesSchema>;
  serial: number;
}

interface QuerySubscriptionEvents {
  "query-update": [results: SubscriptionUpdateResult, serial: number];
}

export class QuerySubscriptions {
  private subscriptions: Map<string, Subscription> = new Map();
  private emitter = new EventEmitter<QuerySubscriptionEvents>();
  private nextSubscriptionId = 0;

  constructor(private readonly pods: PODCollection) {
    this.pods.onUpdate((update) => {
      if (update.type === "delete") {
        for (const [id, sub] of this.subscriptions.entries()) {
          const result = sub.query.query([update.affectedPOD]);
          if (result.matches.length > 0) {
            this.emitter.emit(
              "query-update",
              {
                update: sub.query
                  .query(this.pods.getAll())
                  .matches.map((pod) => pod.serialize()),
                subscriptionId: id
              },
              sub.serial
            );
            sub.serial++;
          }
        }
      } else if (update.type === "insert") {
        for (const [id, sub] of this.subscriptions.entries()) {
          const result = sub.query.query([update.affectedPOD]);
          if (result.matches.length > 0) {
            this.emitter.emit(
              "query-update",
              {
                update: sub.query
                  .query(this.pods.getAll())
                  .matches.map((pod) => pod.serialize()),
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

  public async subscribe(query: PodSpec<EntriesSchema>): Promise<string> {
    const subscriptionId = (this.nextSubscriptionId++).toString();
    this.subscriptions.set(subscriptionId, { query, serial: 0 });

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
