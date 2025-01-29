import typia from "typia";
import type { StatementMap } from "../builders/types/statements.js";
import type { EntryTypes } from "../builders/types/entries.js";
import type { PODSpec } from "../builders/pod.js";

export const assertPODSpec =
  typia.createAssert<PODSpec<EntryTypes, StatementMap>>();
