import typia from "typia";
import type { NamedPODSpecs } from "../builders/group.js";
import type { PODGroupSpec } from "../builders/group.js";
import type { PODSpec } from "../builders/pod.js";
import type { EntryTypes } from "../builders/types/entries.js";
import type { StatementMap } from "../builders/types/statements.js";

export const assertPODSpec =
  typia.createAssert<PODSpec<EntryTypes, StatementMap>>();

export const assertPODGroupSpec =
  typia.createAssert<PODGroupSpec<NamedPODSpecs, StatementMap>>();
