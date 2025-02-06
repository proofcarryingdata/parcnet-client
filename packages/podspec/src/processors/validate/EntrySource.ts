import type { POD, PODEntries, PODName, PODValue } from "@pcd/pod";
import type { NamedPODSpecs, PODGroupSpec } from "../../builders/group.js";
import type { PODSpec } from "../../builders/pod.js";
import type { EntryTypes } from "../../builders/types/entries.js";
import type { StatementMap } from "../../builders/types/statements.js";
import {
  IssueCode,
  type ValidationBaseIssue,
  type ValidationMissingEntryIssue,
  type ValidationMissingPodIssue,
  type ValidationTypeMismatchIssue,
  type ValidationUnexpectedInputEntryIssue,
  type ValidationUnexpectedInputPodIssue,
} from "./issues.js";
import type { ValidateOptions } from "./podValidator.js";

export interface EntrySource {
  getEntry(entryName: string): PODValue | undefined;
  getEntryTypeFromSpec(entryName: string): PODValue["type"] | undefined;
  audit(path: string[], options: ValidateOptions): ValidationBaseIssue[];
}

function auditEntries(
  podEntries: PODEntries,
  spec: PODSpec<EntryTypes, StatementMap>,
  path: string[],
  { exitOnError, strict }: ValidateOptions
): ValidationBaseIssue[] {
  const issues = [];

  for (const [key, entryType] of Object.entries(spec.entries)) {
    if (!Object.prototype.hasOwnProperty.call(podEntries, key)) {
      issues.push({
        code: IssueCode.missing_entry,
        path: [...path, key],
        key,
      } satisfies ValidationMissingEntryIssue);
      if (exitOnError) {
        return issues;
      }
    }
    if (podEntries[key]?.type !== entryType) {
      issues.push({
        code: IssueCode.type_mismatch,
        path: [...path, key],
        expectedType: entryType,
      } satisfies ValidationTypeMismatchIssue);
      if (exitOnError) {
        return issues;
      }
    }
  }

  if (strict) {
    for (const key of Object.keys(podEntries)) {
      if (!Object.prototype.hasOwnProperty.call(spec.entries, key)) {
        issues.push({
          code: IssueCode.unexpected_input_entry,
          path: [...path, key],
          key,
        } satisfies ValidationUnexpectedInputEntryIssue);
        if (exitOnError) {
          return issues;
        }
      }
    }
  }
  return issues;
}

export class EntrySourcePodSpec implements EntrySource {
  private podSpec: PODSpec<EntryTypes, StatementMap>;
  private pod: POD;

  constructor(podSpec: PODSpec<EntryTypes, StatementMap>, pod: POD) {
    this.podSpec = podSpec;
    this.pod = pod;
  }

  public audit(
    path: string[],
    options: ValidateOptions
  ): ValidationBaseIssue[] {
    return auditEntries(
      this.pod.content.asEntries(),
      this.podSpec,
      path,
      options
    );
  }

  public getEntry(entryName: string): PODValue | undefined {
    if (entryName === "$signerPublicKey") {
      return {
        type: "eddsa_pubkey",
        value: this.pod.signerPublicKey,
      };
    } else if (entryName === "$contentID") {
      return {
        type: "cryptographic",
        value: this.pod.content.contentID,
      };
    } else {
      return this.pod.content.getValue(entryName);
    }
  }

  public getEntryTypeFromSpec(entryName: string): PODValue["type"] | undefined {
    if (entryName === "$signerPublicKey") {
      return "eddsa_pubkey";
    } else if (entryName === "$contentID") {
      return "cryptographic";
    } else {
      return this.podSpec.entries[entryName];
    }
  }
}

export class EntrySourcePodGroupSpec implements EntrySource {
  private podGroupSpec: PODGroupSpec<NamedPODSpecs, StatementMap>;
  private pods: Record<PODName, POD>;

  constructor(
    podGroupSpec: PODGroupSpec<NamedPODSpecs, StatementMap>,
    pods: Record<PODName, POD>
  ) {
    this.podGroupSpec = podGroupSpec;
    this.pods = pods;
  }

  /**
   * Audit the pod group for missing entries and pods.
   * @param path - The path to the pod group.
   * @returns - An array of issues.
   */
  public audit(
    path: string[],
    options: ValidateOptions
  ): ValidationBaseIssue[] {
    const issues = [];

    for (const [podName, podSpec] of Object.entries(this.podGroupSpec.pods)) {
      const pod = this.pods[podName];
      if (!pod) {
        issues.push({
          code: IssueCode.missing_pod,
          path: [...path, podName],
          podName,
        } satisfies ValidationMissingPodIssue);
        if (options.exitOnError) {
          return issues;
        }
        continue;
      }

      issues.push(
        ...auditEntries(
          pod.content.asEntries(),
          podSpec,
          [...path, podName],
          options
        )
      );

      if (options.exitOnError && issues.length > 0) {
        return issues;
      }
    }

    if (options.strict) {
      for (const podName of Object.keys(this.pods)) {
        if (
          !Object.prototype.hasOwnProperty.call(this.podGroupSpec.pods, podName)
        ) {
          issues.push({
            code: IssueCode.unexpected_input_pod,
            path: [...path, podName],
            podName,
          } satisfies ValidationUnexpectedInputPodIssue);
          if (options.exitOnError) {
            return issues;
          }
        }
      }
    }
    return issues;
  }

  public getEntry(qualifiedEntryName: string): PODValue | undefined {
    const [podName, entryName] = qualifiedEntryName.split(".");
    if (
      podName === undefined ||
      entryName === undefined ||
      !this.pods[podName]
    ) {
      return undefined;
    }

    if (entryName === "$signerPublicKey") {
      return {
        type: "eddsa_pubkey",
        value: this.pods[podName].signerPublicKey,
      };
    } else if (entryName === "$contentID") {
      return {
        type: "cryptographic",
        value: this.pods[podName].content.contentID,
      };
    } else {
      return this.pods[podName].content.getValue(entryName);
    }
  }

  public getEntryTypeFromSpec(
    qualifiedEntryName: string
  ): PODValue["type"] | undefined {
    const [podName, entryName] = qualifiedEntryName.split(".");
    if (
      podName === undefined ||
      entryName === undefined ||
      !this.podGroupSpec.pods[podName]
    ) {
      return undefined;
    }
    if (entryName === "$signerPublicKey") {
      return "eddsa_pubkey";
    } else if (entryName === "$contentID") {
      return "cryptographic";
    } else {
      return this.podGroupSpec.pods[podName].entries[entryName];
    }
  }
}
