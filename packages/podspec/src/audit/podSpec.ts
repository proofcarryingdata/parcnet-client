import type { PODSpec } from "../builders/pod.js";
import type { EntryTypes } from "../builders/types/entries.js";
import type { StatementMap } from "../builders/types/statements.js";
import { assertPODSpec } from "../generated/podspec.js";

export function auditPODSpec<E extends EntryTypes, S extends StatementMap>(
  spec: PODSpec<E, S>
): void {
  assertPODSpec(spec);

  for (const [key, statement] of Object.entries(spec.statements)) {
    switch (statement.type) {
      case "isMemberOf":
        // TODO: check that statements are valid
        break;
      case "isNotMemberOf":
        // TODO: check that statements are valid
        break;
      default:
        // prettier-ignore
        statement.type satisfies never;
    }
  }
}
