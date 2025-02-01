import { isPODArithmeticValue, type PODEntries } from "@pcd/pod";
import type { NotInRange } from "../../../builders/types/statements.js";
import {
  IssueCode,
  type ValidationBaseIssue,
  type ValidationStatementNegativeResultIssue
} from "../issues.js";
import type { EntryTypes } from "../../../builders/types/entries.js";

export function checkNotInRange(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statement: NotInRange<any, string>,
  statementName: string,
  path: string[],
  entries: PODEntries,
  _specEntries: EntryTypes,
  _exitOnError: boolean
): ValidationBaseIssue[] {
  const entryName = statement.entry;
  const entry = entries[entryName]!;

  // TODO need an issue type for statement referring to a non-existent entry
  // or entry of the wrong type

  const isDate = entry.type === "date";
  const min = isDate
    ? new Date(statement.notInRange.min)
    : BigInt(statement.notInRange.min);
  const max = isDate
    ? new Date(statement.notInRange.max)
    : BigInt(statement.notInRange.max);

  if (isPODArithmeticValue(entry)) {
    const value = entry.value;
    if (value >= min && value <= max) {
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
