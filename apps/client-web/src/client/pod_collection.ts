import { SubscriptionResult } from "@parcnet/client-rpc";
import { POD } from "@pcd/pod";
import { p } from "@pcd/podspec";
import { EventEmitter } from "eventemitter3";

type PODQuery = ReturnType<typeof p.pod>;

interface Subscription {
  query: PODQuery;
  serial: number;
}

export class PODCollection {
  private pods: POD[] = [];
  private subscriptions: Map<string, Subscription> = new Map();
  private emitter = new EventEmitter();
  private nextSubscriptionId = 0;

  public insert(pod: POD): void {
    this.pods.push(pod);

    for (const [id, sub] of this.subscriptions.entries()) {
      const result = sub.query.query([pod]);
      if (result.matches.length > 0) {
        this.emitter.emit(
          "subscription-updated",
          {
            update: sub.query
              .query(this.pods)
              .matches.map((pod) => pod.serialize()),
            subscriptionId: id
          },
          sub.serial
        );
        sub.serial++;
      }
    }
  }

  public delete(signature: string): void {
    let podToDelete: POD | undefined;
    const newCollection = this.pods.filter((pod) => {
      if (pod.signature === signature) {
        podToDelete = pod;
      }
      return pod.signature !== signature;
    });

    if (podToDelete) {
      for (const [id, sub] of this.subscriptions.entries()) {
        const result = sub.query.query([podToDelete]);
        if (result.matches.length > 0) {
          this.emitter.emit(
            "subscription-updated",
            {
              update: sub.query
                .query(this.pods)
                .matches.map((pod) => pod.serialize()),
              subscriptionId: id
            },
            sub.serial
          );
          sub.serial++;
        }
      }
    }

    if (podToDelete) {
      this.pods = newCollection;
    }
  }

  public query(query: PODQuery): POD[] {
    return query.query(this.pods).matches;
  }

  public async subscribe(query: PODQuery): Promise<string> {
    const subscriptionId = (this.nextSubscriptionId++).toString();
    this.subscriptions.set(subscriptionId, { query, serial: 0 });

    return subscriptionId;
  }

  public unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  public onSubscriptionUpdated(
    callback: (update: SubscriptionResult, serial: number) => void
  ): void {
    this.emitter.on("subscription-updated", callback);
  }
}
