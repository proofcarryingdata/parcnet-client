import EventEmitter from "eventemitter3";
import {
  PODCollection,
  type PODCollectionEvents,
  type PODCollectionUpdate
} from "./pod_collection";
import { loadPODsFromStorage, savePODsToStorage } from "./utils";

export class PODCollectionManager {
  private collections: Record<string, PODCollection>;
  private emitter = new EventEmitter<PODCollectionEvents>();

  private constructor(collections: Record<string, PODCollection>) {
    this.collections = collections;
    for (const collection of Object.values(this.collections)) {
      collection.onUpdate((update) => {
        savePODsToStorage(this.collections);
        this.emitter.emit("update", update);
      });
    }
  }

  public onUpdate(listener: (update: PODCollectionUpdate) => void): void {
    this.emitter.on("update", listener);
  }

  public get(collectionId: string): PODCollection {
    if (!this.collections[collectionId]) {
      this.collections[collectionId] = new PODCollection();
      this.collections[collectionId].onUpdate((update) => {
        savePODsToStorage(this.collections);
        this.emitter.emit("update", update);
      });
    }
    return this.collections[collectionId];
  }

  public static loadFromStorage(): PODCollectionManager {
    const collections = loadPODsFromStorage();
    return new PODCollectionManager(collections);
  }
}
