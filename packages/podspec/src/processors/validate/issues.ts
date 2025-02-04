import type { PODValue } from "@pcd/pod";
import type { Statements } from "../../builders/types/statements.js";

export const IssueCode = {
  type_mismatch: "type_mismatch",
  missing_entry: "missing_entry",
  missing_pod: "missing_pod",
  invalid_entry_name: "invalid_entry_name",
  invalid_pod_value: "invalid_pod_value",
  invalid_statement: "invalid_statement",
  unexpected_input_entry: "unexpected_input_entry",
  unexpected_input_pod: "unexpected_input_pod",
  statement_negative_result: "statement_negative_result",
} as const;

/**
 @todo
 - [ ] include statement name where relevant
 - [ ] include position in list where relevant
 */

/**
 * Base interface for all issues that can occur when validating a POD
 * against a Podspec.
 */
export interface ValidationBaseIssue {
  message?: string;
  path: (string | number)[];
  code: (typeof IssueCode)[keyof typeof IssueCode];
}

/**
 * Issue that occurs when an input value is of an invalid type.
 */
export interface ValidationTypeMismatchIssue extends ValidationBaseIssue {
  code: typeof IssueCode.type_mismatch;
  expectedType: PODValue["type"] | "PODEntries";
}

/**
 * Issue that occurs when an input value is missing from the PODEntries.
 */
export interface ValidationMissingEntryIssue extends ValidationBaseIssue {
  code: typeof IssueCode.missing_entry;
  key: string;
}

/**
 * Issue that occurs when a pod is missing from a pod group.
 */
export interface ValidationMissingPodIssue extends ValidationBaseIssue {
  code: typeof IssueCode.missing_pod;
  podName: string;
}

/**
 * Issue that occurs when an input value has an invalid entry name.
 */
export interface ValidationInvalidEntryNameIssue extends ValidationBaseIssue {
  code: typeof IssueCode.invalid_entry_name;
  name: string;
  description: string;
}

/**
 * Issue that occurs when a statement is invalid.
 */
export interface ValidationInvalidStatementIssue extends ValidationBaseIssue {
  code: typeof IssueCode.invalid_statement;
  statementName: string;
  statementType: Statements["type"];
  entries: string[];
}

/**
 * Issue that occurs when a POD value is invalid.
 */
export interface ValidationInvalidPodValueIssue extends ValidationBaseIssue {
  code: typeof IssueCode.invalid_pod_value;
  value: PODValue;
  reason: string;
}

/**
 * Issue that occurs when an unexpected entry is encountered.
 * Only relevant for "strict" parsing modes.
 */
export interface ValidationUnexpectedInputEntryIssue
  extends ValidationBaseIssue {
  code: typeof IssueCode.unexpected_input_entry;
  key: string;
}

/**
 * Issue that occurs when an unexpected pod is encountered.
 * Only relevant for "strict" parsing modes.
 */
export interface ValidationUnexpectedInputPodIssue extends ValidationBaseIssue {
  code: typeof IssueCode.unexpected_input_pod;
  podName: string;
}

/**
 * Issue that occurs when a statement fails.
 */
export interface ValidationStatementNegativeResultIssue
  extends ValidationBaseIssue {
  code: typeof IssueCode.statement_negative_result;
  statementName: string;
  statementType: Statements["type"];
  entries: string[];
}

export type ValidationIssue =
  | ValidationTypeMismatchIssue
  | ValidationMissingEntryIssue
  | ValidationMissingPodIssue
  | ValidationInvalidEntryNameIssue
  | ValidationInvalidStatementIssue
  | ValidationInvalidPodValueIssue
  | ValidationUnexpectedInputEntryIssue
  | ValidationUnexpectedInputPodIssue
  | ValidationStatementNegativeResultIssue;

/**
 * Exception class for errors that occur when parsing.
 */
export class ValidationError extends Error {
  issues: ValidationBaseIssue[] = [];

  public errors(): ValidationBaseIssue[] {
    return this.issues;
  }

  constructor(issues: ValidationBaseIssue[]) {
    super();
    this.name = "ValidationError";
    this.issues = issues;
  }
}
