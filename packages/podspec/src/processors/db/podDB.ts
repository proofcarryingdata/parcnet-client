import type { POD } from "@pcd/pod";
import type { NamedPODSpecs, PODGroupSpec } from "../../builders/group.js";
import type { PODSpec } from "../../builders/pod.js";
import type { EntryTypes } from "../../builders/types/entries.js";
import type { StatementMap } from "../../builders/types/statements.js";
import type { NamedStrongPODs } from "../../spec/types.js";
import { groupValidator } from "../validate/groupValidator.js";
import { podValidator } from "../validate/podValidator.js";

interface PODIndexes {
  // Index for finding signatures by entry name + type
  byEntryNameAndType: Map<string, Map<string, Set<string>>>;
  // Index for finding signatures by value hash
  // byValueHash: Map<bigint, Set<string>>;
  // Index for finding PODs by signature
  bySignature: Map<string, POD>;
}

export class PODDB {
  private pods = new Set<POD>();
  private indexes: PODIndexes = {
    byEntryNameAndType: new Map(),
    //  byValueHash: new Map(),
    bySignature: new Map(),
  };

  /**
   * Insert a single POD into the database
   */
  public insert(pod: POD): void {
    this.pods.add(pod);
    this.indexPOD(pod);
  }

  /**
   * Insert multiple PODs into the database
   */
  public insertMany(pods: POD[]): void {
    pods.forEach((pod) => this.insert(pod));
  }

  /**
   * Index a POD's entries for quick lookups
   */
  private indexPOD(pod: POD): void {
    const entries = pod.content.listEntries();
    for (const entry of entries) {
      // Index by entry name + type
      if (!this.indexes.byEntryNameAndType.has(entry.name)) {
        this.indexes.byEntryNameAndType.set(entry.name, new Map());
      }
      const typeMap = this.indexes.byEntryNameAndType.get(entry.name)!;
      if (!typeMap.has(entry.value.type)) {
        typeMap.set(entry.value.type, new Set());
      }
      typeMap.get(entry.value.type)!.add(pod.signature);

      // Index by value hash
      // const hash = podValueHash(entry.value);
      // if (!this.indexes.byValueHash.has(hash)) {
      //   this.indexes.byValueHash.set(hash, new Set());
      // }
      // this.indexes.byValueHash.get(hash)!.add(pod.signature);

      // Index by signature
      if (!this.indexes.bySignature.has(pod.signature)) {
        this.indexes.bySignature.set(pod.signature, pod);
      }
    }
  }

  /**
   * Query PODs that match a PODSpec
   */
  public queryBySpec(spec: PODSpec<EntryTypes, StatementMap>): Set<POD> {
    const initialResults = new Set<string>();

    // Find all PODs that have the required entries
    for (const [entryName, entryType] of Object.entries(spec.entries)) {
      const typeMap = this.indexes.byEntryNameAndType.get(entryName);
      if (!typeMap) {
        initialResults.clear();
        break;
      }

      const signaturesForNameAndType = typeMap.get(entryType);
      if (!signaturesForNameAndType) {
        initialResults.clear();
        break;
      }

      if (initialResults.size === 0) {
        signaturesForNameAndType.forEach((signature) =>
          initialResults.add(signature)
        );
      } else {
        for (const signature of initialResults) {
          if (!signaturesForNameAndType.has(signature)) {
            initialResults.delete(signature);
          }
        }
      }

      if (initialResults.size === 0) {
        break;
      }
    }

    const pods = Array.from(initialResults).map(
      (signature) => this.indexes.bySignature.get(signature)!
    );

    const finalResults = new Set<POD>();
    const validator = podValidator(spec);

    for (const pod of pods) {
      // This is not fully optimal as this will repeat some of the checks we
      // did by looking up via indexes, but it will also apply any statements
      // that are not covered by the indexes. We've still massively reduced
      // the number of PODs we need to check by using the indexes.
      if (validator.check(pod)) {
        finalResults.add(pod);
      }
    }

    return finalResults;
  }

  /**
   * Query PODs that match a PODGroupSpec
   */
  public queryByGroupSpec<P extends NamedPODSpecs>(
    groupSpec: PODGroupSpec<P, StatementMap>
  ): NamedStrongPODs<P>[] {
    // Get candidates for each slot
    const candidates = new Map<string, Set<POD>>();

    for (const [name, spec] of Object.entries(groupSpec.pods)) {
      const result = this.queryBySpec(spec);
      candidates.set(name, result);
    }

    // Generate all possible combinations
    // This is a _very_ naive implementation that will quickly become
    // infeasible as the number of slots and PODs grows.
    // However, we can implement specialized checks for certain statements
    // which will greatly speed this up.
    const slotNames = Array.from(candidates.keys());
    const combinations = this.generateCombinations<P>(slotNames, candidates);

    const validator = groupValidator(groupSpec);

    return Array.from(combinations).filter((combo) => {
      return validator.check(combo);
    });
  }

  private generateCombinations<P extends NamedPODSpecs>(
    slotNames: string[],
    candidates: Map<string, Set<POD>>
  ): Set<NamedStrongPODs<P>> {
    // Start with an empty combination
    let results: Map<string, POD>[] = [new Map<string, POD>()];

    // For each slot
    for (const slotName of slotNames) {
      const slotCandidates = candidates.get(slotName)!;
      const newResults: Map<string, POD>[] = [];

      // For each existing partial combination
      for (const partial of results) {
        // For each candidate POD in this slot
        for (const pod of slotCandidates) {
          // Create a new combination with this POD added
          const newCombination = new Map(partial);
          newCombination.set(slotName, pod);
          newResults.push(newCombination);
        }
      }

      results = newResults;
    }

    // Convert to the expected return type
    return new Set(results.map((combo) => Object.fromEntries(combo))) as Set<
      NamedStrongPODs<P>
    >;
  }

  /**
   * Clear all PODs and indexes
   */
  public clear(): void {
    this.pods.clear();
    this.indexes.byEntryNameAndType.clear();
    // this.indexes.byValueHash.clear();
  }
}
