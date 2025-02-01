import type { NotEqualsEntry } from "../../../builders/types/statements.js";
import type { EntrySource } from "../EntrySource.js";
import {
  IssueCode,
  type ValidationBaseIssue,
  type ValidationStatementNegativeResultIssue
} from "../issues.js";
import { valueIsEqual } from "../utils.js";

export function checkNotEqualsEntry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statement: NotEqualsEntry<any, string, string>,
  statementName: string,
  path: string[],
  entrySource: EntrySource,
  _exitOnError: boolean
): ValidationBaseIssue[] {
  const entry1 = entrySource.getEntry(statement.entry);
  const entry2 = entrySource.getEntry(statement.otherEntry);

  const issues = [];

  // TODO pre-process? might need more detailed issue type for invalid statements
  if (entry1 === undefined) {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: [statement.entry],
      path: [...path, statementName]
    });
    return issues;
  }
  if (entry2 === undefined) {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: [statement.otherEntry],
      path: [...path, statementName]
    });
    return issues;
  }

  const entry1Type = entrySource.getEntryTypeFromSpec(statement.entry);
  const entry2Type = entrySource.getEntryTypeFromSpec(statement.otherEntry);

  if (entry1Type !== entry2Type) {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: [statement.entry, statement.otherEntry],
      path: [...path, statementName]
    });
    return issues;
  }

  if (entry1Type !== entry1.type) {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: [statement.entry],
      path: [...path, statementName]
    });
    return issues;
  }

  if (entry1Type !== entry2.type) {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: [statement.otherEntry],
      path: [...path, statementName]
    });
    return issues;
  }

  const isNotEqual = !valueIsEqual(entry1.value, entry2.value);

  if (!isNotEqual) {
    const issue = {
      code: IssueCode.statement_negative_result,
      statementName: statementName,
      statementType: statement.type,
      entries: [statement.entry, statement.otherEntry],
      path: [...path, statementName]
    } satisfies ValidationStatementNegativeResultIssue;
    return [issue];
  }

  return [];
}
