import { isPODArithmeticValue, type PODEntries } from "@pcd/pod";
import type { InRange } from "../../../builders/types/statements.js";
import {
  IssueCode,
  type ValidationBaseIssue,
  type ValidationStatementNegativeResultIssue
} from "../issues.js";
import type { EntryTypes } from "../../../builders/types/entries.js";

export function checkInRange(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statement: InRange<any, string>,
  statementName: string,
  path: string[],
  entries: PODEntries,
  specEntries: EntryTypes,
  exitOnError: boolean
): ValidationBaseIssue[] {
  const entryName = statement.entry;
  const entry = entries[entryName]!;

  // @TODO need an issue type for statement referring to a non-existent entry
  // or entry of the wrong type

  if (isPODArithmeticValue(entry)) {
    const value = entry.value;
    // @TODO date comparison?
    // maybe the spec should convert dates to bigints, and we also convert
    // dates to bigints here, so we have a consistent way to compare dates
    // correct framing here is "how do we serialize statement parameters",
    // followed by "how do we deserialize statement parameters into the
    // format required by the processor".
    // so the specifier provides, say, Date objects. the builder may serialize
    // those as strings or bigints. the processor needs bigints.
    if (value < statement.inRange.min || value > statement.inRange.max) {
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
