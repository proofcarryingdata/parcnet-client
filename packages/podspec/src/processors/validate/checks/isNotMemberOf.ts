import type { PODEntries } from "@pcd/pod";
import {
  IssueCode,
  type ValidationBaseIssue,
  type ValidationInvalidStatementIssue,
  type ValidationStatementNegativeResultIssue
} from "../issues.js";
import type { IsNotMemberOf } from "../../../builders/types/statements.js";
import type { EntryTypes } from "../../../builders/types/entries.js";

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

  for (const listMember of statement.isNotMemberOf) {
    if (
      listMember.every((value, index) => {
        return value !== tuple[index];
      })
    ) {
      break;
    }
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
