import { isPODArithmeticValue } from "@pcd/pod";
import type { InRange } from "../../../builders/types/statements.js";
import {
  IssueCode,
  type ValidationBaseIssue,
  type ValidationInvalidStatementIssue,
  type ValidationStatementNegativeResultIssue
} from "../issues.js";
import type { EntrySource } from "../EntrySource.js";

export function checkInRange(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statement: InRange<any, string>,
  statementName: string,
  path: string[],
  entrySource: EntrySource,
  _exitOnError: boolean
): ValidationBaseIssue[] {
  const entryName = statement.entry;
  const entry = entrySource.getEntry(entryName);

  // TODO need an issue type for statement referring to a non-existent entry
  // or entry of the wrong type
  if (entry === undefined) {
    const issues = [
      {
        code: IssueCode.invalid_statement,
        statementName: statementName,
        statementType: statement.type,
        entries: [entryName],
        path: [...path, statementName]
      } satisfies ValidationInvalidStatementIssue
    ];
    return issues;
  }

  const isDate = entry.type === "date";
  const min = isDate
    ? new Date(statement.inRange.min)
    : BigInt(statement.inRange.min);
  const max = isDate
    ? new Date(statement.inRange.max)
    : BigInt(statement.inRange.max);

  if (isPODArithmeticValue(entry)) {
    const value = entry.value;
    if (value < min || value > max) {
      return [
        {
          code: IssueCode.statement_negative_result,
          statementName: statementName,
          statementType: statement.type,
          entries: [entryName],
          path: [...path, statementName]
        } satisfies ValidationStatementNegativeResultIssue as ValidationBaseIssue
      ];
    }
  }

  return [];
}
