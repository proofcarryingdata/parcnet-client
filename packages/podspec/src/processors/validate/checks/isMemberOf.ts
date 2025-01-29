import type { PODEntries } from "@pcd/pod";
import type {
  ValidationBaseIssue,
  ValidationInvalidStatementIssue,
  ValidationStatementNegativeResultIssue
} from "../issues.js";
import { IssueCode } from "../issues.js";
import type { IsMemberOf } from "../../../builders/types/statements.js";
import type { EntryTypes } from "../../../builders/types/entries.js";

function validateIsMemberOfStatement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statement: IsMemberOf<any, string[]>,
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

export function checkIsMemberOf(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statement: IsMemberOf<any, string[]>,
  statementName: string,
  path: string[],
  podEntries: PODEntries,
  specEntries: EntryTypes,
  exitOnError: boolean
): ValidationBaseIssue[] {
  const issues: ValidationBaseIssue[] = validateIsMemberOfStatement(
    statement,
    statementName,
    path,
    specEntries
  );
  if (issues.length > 0) {
    // Can't proceed if there are issues with the statement
    return issues;
  }

  const tuple = statement.entries.map((entry) => podEntries[entry]?.value);

  for (const listMember of statement.isMemberOf) {
    if (
      listMember.some((value, index) => {
        return value === tuple[index];
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
