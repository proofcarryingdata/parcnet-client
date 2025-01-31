import type { PODEntries } from "@pcd/pod";
import {
  IssueCode,
  type ValidationBaseIssue,
  type ValidationInvalidStatementIssue,
  type ValidationStatementNegativeResultIssue
} from "../issues.js";
import type { IsNotMemberOf } from "../../../builders/types/statements.js";
import type { EntryTypes } from "../../../builders/types/entries.js";
import { tupleToPODValueTypeValues, valueIsEqual } from "../utils.js";

function validateIsNotMemberOfStatement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statement: IsNotMemberOf<any, string[]>,
  statementName: string,
  path: string[],
  specEntries: EntryTypes
): ValidationInvalidStatementIssue[] {
  if (statement.entries.some((entry) => !(entry in specEntries))) {
    return [
      {
        code: IssueCode.invalid_statement,
        statementName: statementName,
        statementType: statement.type,
        entries: statement.entries,
        path: [...path, statementName]
      }
    ];
  }
  return [];
}

export function checkIsNotMemberOf(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statement: IsNotMemberOf<any, string[]>,
  statementName: string,
  path: string[],
  entries: PODEntries,
  specEntries: EntryTypes,
  exitOnError: boolean
): ValidationBaseIssue[] {
  // TODO Move this to a pre-processing step
  const issues: ValidationBaseIssue[] = validateIsNotMemberOfStatement(
    statement,
    statementName,
    path,
    specEntries
  );

  // Can't proceed if there are any issues with the statement
  if (issues.length > 0) {
    return issues;
  }

  const tuple = statement.entries.map((entry) => entries[entry]?.value);
  // TODO Move this to a pre-processing step
  const tuplesToMatch = tupleToPODValueTypeValues(
    statement.isNotMemberOf,
    statement.entries
  );

  let match = false;
  for (const listMember of tuplesToMatch) {
    for (let index = 0; index < tuple.length; index++) {
      if (valueIsEqual(tuple[index]!, listMember[index]!)) {
        match = true;
        break;
      }
    }
    if (match) {
      break;
    }
  }
  // If we found a match, then the result is negative
  if (match) {
    const issue = {
      code: IssueCode.statement_negative_result,
      statementName: statementName,
      statementType: statement.type,
      entries: statement.entries,
      path: [...path, statementName]
    } satisfies ValidationStatementNegativeResultIssue;
    if (exitOnError) {
      return [issue];
    } else {
      issues.push(issue);
    }
  }
  return issues;
}
