import { PODValue } from "@pcd/pod";

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

export interface PodspecBaseIssue {
  message?: string;
  path: (string | number)[];
  code: IssueCode;
}

export interface PodspecInvalidTypeIssue extends PodspecBaseIssue {
  code: IssueCode.invalid_type;
  expectedType: PODValue["type"] | "PODEntries";
}

export interface PodspecNotInListIssue extends PodspecBaseIssue {
  code: IssueCode.not_in_list;
  value: PODValue;
  list: PODValue[];
}

export interface PodspecExcludedByListIssue extends PodspecBaseIssue {
  code: IssueCode.excluded_by_list;
  value: PODValue;
  list: PODValue[];
}

export interface PodspecNotInRangeIssue extends PodspecBaseIssue {
  code: IssueCode.not_in_range;
  value: bigint;
  min: bigint;
  max: bigint;
}

export interface PodspecMissingEntryIssue extends PodspecBaseIssue {
  code: IssueCode.missing_entry;
  key: string;
}

export interface PodspecInvalidEntryNameIssue extends PodspecBaseIssue {
  code: IssueCode.invalid_entry_name;
  name: string;
  description: string;
}

export interface PodspecInvalidTupleEntryIssue extends PodspecBaseIssue {
  code: IssueCode.invalid_tuple_entry;
  name: string;
}

export interface PodspecNotInTupleListIssue extends PodspecBaseIssue {
  code: IssueCode.not_in_tuple_list;
  value: PODValue[];
  list: PODValue[][];
}

export interface PodspecExcludedByTupleListIssue extends PodspecBaseIssue {
  code: IssueCode.excluded_by_tuple_list;
  value: PODValue[];
  list: PODValue[][];
}

export interface PodspecSignerNotInListIssue extends PodspecBaseIssue {
  code: IssueCode.signer_not_in_list;
  signer: string;
  list: string[];
}

export interface PodspecSignerExcludedByListIssue extends PodspecBaseIssue {
  code: IssueCode.signer_excluded_by_list;
  signer: string;
  list: string[];
}

export interface PodspecSignatureNotInListIssue extends PodspecBaseIssue {
  code: IssueCode.signature_not_in_list;
  signature: string;
  list: string[];
}

export interface PodspecSignatureExcludedByListIssue extends PodspecBaseIssue {
  code: IssueCode.signature_excluded_by_list;
  signature: string;
  list: string[];
}

export interface PodspecInvalidPodValueIssue extends PodspecBaseIssue {
  code: IssueCode.invalid_pod_value;
  value: PODValue;
  reason: string;
}

export interface PodspecUnexpectedInputEntryIssue extends PodspecBaseIssue {
  code: IssueCode.unexpected_input_entry;
  name: string;
}

export type PodspecIssue =
  | PodspecInvalidTypeIssue
  | PodspecNotInListIssue
  | PodspecExcludedByListIssue
  | PodspecNotInRangeIssue
  | PodspecMissingEntryIssue
  | PodspecInvalidEntryNameIssue
  | PodspecInvalidTupleEntryIssue
  | PodspecNotInTupleListIssue
  | PodspecExcludedByTupleListIssue
  | PodspecSignerNotInListIssue
  | PodspecSignerExcludedByListIssue
  | PodspecSignatureNotInListIssue
  | PodspecSignatureExcludedByListIssue
  | PodspecInvalidPodValueIssue
  | PodspecUnexpectedInputEntryIssue;

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
