import { isPODArithmeticValue } from "@pcd/pod";
import type { InRange } from "../../../builders/types/statements.js";
import type { EntrySource } from "../EntrySource.js";
import {
  IssueCode,
  type ValidationBaseIssue,
  type ValidationInvalidStatementIssue,
  type ValidationStatementNegativeResultIssue,
} from "../issues.js";

export function checkInRange(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statement: InRange<any, string>,
  statementName: string,
  path: string[],
  entrySource: EntrySource,
  _exitOnError: boolean
): ValidationBaseIssue[] {
  const [entryName] = statement.entries;
  const entry = entrySource.getEntry(entryName);
  const issues = [];

  // TODO need an issue type for statement referring to a non-existent entry
  // or entry of the wrong type
  if (entry === undefined) {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: [entryName],
      path: [...path, statementName],
    } satisfies ValidationInvalidStatementIssue);
    return issues;
  }

  const isDate = entry.type === "date";
  const min = isDate
    ? new Date(parseInt(statement.inRange.min))
    : BigInt(statement.inRange.min);
  const max = isDate
    ? new Date(parseInt(statement.inRange.max))
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
          path: [...path, statementName],
        } satisfies ValidationStatementNegativeResultIssue as ValidationBaseIssue,
      ];
    }
  } else {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: [entryName],
      path: [...path, statementName],
    } satisfies ValidationInvalidStatementIssue);
  }
  return issues;
}
