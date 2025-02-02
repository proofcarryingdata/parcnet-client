import { isPODArithmeticValue } from "@pcd/pod";
import type { LessThanEq } from "../../../builders/types/statements.js";
import type { EntrySource } from "../EntrySource.js";
import { IssueCode } from "../issues.js";

export function checkLessThanEq(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statement: LessThanEq<any, string, string>,
  statementName: string,
  path: string[],
  entrySource: EntrySource,
  _exitOnError: boolean
) {
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
      path: [...path, statementName],
    });
    return issues;
  }
  if (entry2 === undefined) {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: [statement.otherEntry],
      path: [...path, statementName],
    });
    return issues;
  }

  const entry1Type = entrySource.getEntryTypeFromSpec(statement.entry);
  const entry2Type = entrySource.getEntryTypeFromSpec(statement.otherEntry);

  // TODO this may be too restrictive
  if (entry1Type !== entry2Type) {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: [statement.entry, statement.otherEntry],
      path: [...path, statementName],
    });
    return issues;
  }

  if (entry1Type !== entry1.type) {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: [statement.entry],
      path: [...path, statementName],
    });
    return issues;
  }

  if (entry1Type !== entry2.type) {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: [statement.otherEntry],
      path: [...path, statementName],
    });
    return issues;
  }

  if (!isPODArithmeticValue(entry1) || !isPODArithmeticValue(entry2)) {
    issues.push({
      code: IssueCode.invalid_statement,
      statementName: statementName,
      statementType: statement.type,
      entries: [statement.entry, statement.otherEntry],
      path: [...path, statementName],
    });
    return issues;
  }

  const isLessThanOrEqual = entry1.value <= entry2.value;

  if (!isLessThanOrEqual) {
    issues.push({
      code: IssueCode.statement_negative_result,
      statementName: statementName,
      statementType: statement.type,
      entries: [statement.entry, statement.otherEntry],
      path: [...path, statementName],
    });
  }
  return issues;
}
