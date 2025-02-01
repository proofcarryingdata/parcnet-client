import type {
  ValidationBaseIssue,
  ValidationInvalidStatementIssue,
  ValidationStatementNegativeResultIssue
} from "../issues.js";
import { IssueCode } from "../issues.js";
import type { IsMemberOf } from "../../../builders/types/statements.js";
import { tupleToPODValueTypeValues, valueIsEqual } from "../utils.js";
import type { EntrySource } from "../EntrySource.js";

function validateIsMemberOfStatement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statement: IsMemberOf<any, string[]>,
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

export function checkIsMemberOf(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statement: IsMemberOf<any, string[]>,
  statementName: string,
  path: string[],
  entrySource: EntrySource,
  exitOnError: boolean
): ValidationBaseIssue[] {
  // TODO Move this to a pre-processing step
  const issues: ValidationBaseIssue[] = validateIsMemberOfStatement(
    statement,
    statementName,
    path,
    entrySource
  );
  if (issues.length > 0) {
    // Can't proceed if there are issues with the statement
    return issues;
  }

  const tuple = statement.entries.map(
    (entry) => entrySource.getEntry(entry)?.value
  );

  // TODO Move this to a pre-processing step
  const tuplesToMatch = tupleToPODValueTypeValues(
    statement.isMemberOf,
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
  if (!match) {
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
