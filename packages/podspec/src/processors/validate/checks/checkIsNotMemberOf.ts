import {
  IssueCode,
  type ValidationBaseIssue,
  type ValidationInvalidStatementIssue,
  type ValidationStatementNegativeResultIssue
} from "../issues.js";
import type { IsNotMemberOf } from "../../../builders/types/statements.js";
import { tupleToPODValueTypeValues, valueIsEqual } from "../utils.js";
import type { EntrySource } from "../EntrySource.js";

function validateIsNotMemberOfStatement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statement: IsNotMemberOf<any, string[]>,
  statementName: string,
  path: string[],
  entrySource: EntrySource
): ValidationInvalidStatementIssue[] {
  if (statement.entries.some((entry) => !entrySource.getEntry(entry))) {
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
  entrySource: EntrySource,
  exitOnError: boolean
): ValidationBaseIssue[] {
  // TODO Move this to a pre-processing step
  const issues: ValidationBaseIssue[] = validateIsNotMemberOfStatement(
    statement,
    statementName,
    path,
    entrySource
  );

  // Can't proceed if there are any issues with the statement
  if (issues.length > 0) {
    return issues;
  }

  const tuple = statement.entries.map(
    (entry) => entrySource.getEntry(entry)?.value
  );
  // TODO Move this to a pre-processing step
  const tuplesToMatch = tupleToPODValueTypeValues(
    statement.isNotMemberOf,
    statement.entries.map(
      (entry) => entrySource.getEntryTypeFromSpec(entry) as string
    )
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
