import { PODValue } from "@pcd/pod";

/**
 * Enum of all the possible issues that can occur when validating a POD
 * against a Podspec.
 */
export enum IssueCode {
  invalid_type = "invalid_type",
  not_in_list = "not_in_list",
  excluded_by_list = "excluded_by_list",
  not_in_range = "not_in_range",
  missing_entry = "missing_entry",
  invalid_entry_name = "invalid_entry_name",
  invalid_tuple_entry = "invalid_tuple_entry",
  not_in_tuple_list = "not_in_tuple_list",
  excluded_by_tuple_list = "excluded_by_tuple_list",
  signer_not_in_list = "signer_not_in_list",
  signer_excluded_by_list = "signer_excluded_by_list",
  signature_not_in_list = "signature_not_in_list",
  signature_excluded_by_list = "signature_excluded_by_list",
  invalid_pod_value = "invalid_pod_value",
  unexpected_input_entry = "unexpected_input_entry"
}

/**
 * Base interface for all issues that can occur when validating a POD
 * against a Podspec.
 */
export interface PodspecBaseIssue {
  message?: string;
  path: (string | number)[];
  code: IssueCode;
}

/**
 * Issue that occurs when an input value is of an invalid type.
 */
export interface PodspecInvalidTypeIssue extends PodspecBaseIssue {
  code: IssueCode.invalid_type;
  expectedType: PODValue["type"] | "PODEntries";
}

/**
 * Issue that occurs when an input value is not in a list of allowed values.
 */
export interface PodspecNotInListIssue extends PodspecBaseIssue {
  code: IssueCode.not_in_list;
  value: PODValue;
  list: PODValue[];
}

/**
 * Issue that occurs when an input value is excluded by a list of allowed values.
 */
export interface PodspecExcludedByListIssue extends PodspecBaseIssue {
  code: IssueCode.excluded_by_list;
  value: PODValue;
  list: PODValue[];
}

/**
 * Issue that occurs when an input value is not in a range of allowed values.
 */
export interface PodspecNotInRangeIssue extends PodspecBaseIssue {
  code: IssueCode.not_in_range;
  value: bigint;
  min: bigint;
  max: bigint;
}

/**
 * Issue that occurs when an input value is missing from the PODEntries.
 */
export interface PodspecMissingEntryIssue extends PodspecBaseIssue {
  code: IssueCode.missing_entry;
  key: string;
}

/**
 * Issue that occurs when an input value has an invalid entry name.
 */
export interface PodspecInvalidEntryNameIssue extends PodspecBaseIssue {
  code: IssueCode.invalid_entry_name;
  name: string;
  description: string;
}

/**
 * Issue that occurs when an invalid entry is specified as part of a tuple,
 * e.g. because the specified entry does not exist.
 */
export interface PodspecInvalidTupleEntryIssue extends PodspecBaseIssue {
  code: IssueCode.invalid_tuple_entry;
  name: string;
}

/**
 * Issue that occurs when an input value is not in a list of allowed values.
 */
export interface PodspecNotInTupleListIssue extends PodspecBaseIssue {
  code: IssueCode.not_in_tuple_list;
  value: PODValue[];
  list: PODValue[][];
}

/**
 * Issue that occurs when an input value is excluded by a list of allowed values.
 */
export interface PodspecExcludedByTupleListIssue extends PodspecBaseIssue {
  code: IssueCode.excluded_by_tuple_list;
  value: PODValue[];
  list: PODValue[][];
}

/**
 * Issue that occurs when a signer public key is not in a list of allowed values.
 */
export interface PodspecSignerNotInListIssue extends PodspecBaseIssue {
  code: IssueCode.signer_not_in_list;
  signer: string;
  list: string[];
}

/**
 * Issue that occurs when a signer public key is excluded by a list of allowed values.
 */
export interface PodspecSignerExcludedByListIssue extends PodspecBaseIssue {
  code: IssueCode.signer_excluded_by_list;
  signer: string;
  list: string[];
}

/**
 * Issue that occurs when a signature is not in a list of allowed values.
 */
export interface PodspecSignatureNotInListIssue extends PodspecBaseIssue {
  code: IssueCode.signature_not_in_list;
  signature: string;
  list: string[];
}

/**
 * Issue that occurs when a signature is excluded by a list of allowed values.
 */
export interface PodspecSignatureExcludedByListIssue extends PodspecBaseIssue {
  code: IssueCode.signature_excluded_by_list;
  signature: string;
  list: string[];
}

/**
 * Issue that occurs when a POD value is invalid.
 */
export interface PodspecInvalidPodValueIssue extends PodspecBaseIssue {
  code: IssueCode.invalid_pod_value;
  value: PODValue;
  reason: string;
}

/**
 * Issue that occurs when an unexpected entry is encountered.
 * Only relevant for "strict" parsing modes.
 */
export interface PodspecUnexpectedInputEntryIssue extends PodspecBaseIssue {
  code: IssueCode.unexpected_input_entry;
  name: string;
}

/**
 * Exception class for errors that occur when parsing.
 */
export class PodspecError extends Error {
  issues: PodspecBaseIssue[] = [];

  public get errors(): PodspecBaseIssue[] {
    return this.issues;
  }

  constructor(issues: PodspecBaseIssue[]) {
    super();
    this.name = "PodspecError";
    this.issues = issues;
  }
}
