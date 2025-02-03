import { isPODArithmeticValue } from "@pcd/pod";
import type { GreaterThan } from "../../../builders/types/statements.js";
import type { EntrySource } from "../EntrySource.js";
import { IssueCode } from "../issues.js";

export function checkGreaterThan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statement: GreaterThan<any, string, string>,
  statementName: string,
  path: string[],
  entrySource: EntrySource,
  _exitOnError: boolean
) {
  const [leftEntry, rightEntry] = statement.entries;
  const entry1 = entrySource.getEntry(leftEntry);
  const entry2 = entrySource.getEntry(rightEntry);

  const issues = [];

  // TODO pre-process? might need more detailed issue type for invalid statements
  if (entry1 === undefined) {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: statement.entries,
      path: [...path, statementName],
    });
    return issues;
  }
  if (entry2 === undefined) {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: statement.entries,
      path: [...path, statementName],
    });
    return issues;
  }

  const entry1Type = entrySource.getEntryTypeFromSpec(leftEntry);
  const entry2Type = entrySource.getEntryTypeFromSpec(rightEntry);

  // TODO this may be too restrictive
  if (entry1Type !== entry2Type) {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: statement.entries,
      path: [...path, statementName],
    });
    return issues;
  }

  if (entry1Type !== entry1.type) {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: statement.entries,
      path: [...path, statementName],
    });
    return issues;
  }

  if (entry1Type !== entry2.type) {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: statement.entries,
      path: [...path, statementName],
    });
    return issues;
  }

  if (!isPODArithmeticValue(entry1) || !isPODArithmeticValue(entry2)) {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: statement.entries,
      path: [...path, statementName],
    });
    return issues;
  }

  const isGreaterThan = entry1.value > entry2.value;

  if (!isGreaterThan) {
    issues.push({
      code: IssueCode.statement_negative_result,
      statementName: statementName,
      statementType: statement.type,
      entries: statement.entries,
      path: [...path, statementName],
    });
  }
  return issues;
}
