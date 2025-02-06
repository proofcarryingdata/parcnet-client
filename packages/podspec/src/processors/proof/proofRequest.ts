import type { NamedPODSpecs, PODGroupSpec } from "../../builders/group.js";
import type { StatementMap } from "../../builders/types/statements.js";

export interface ProofRequest<P extends NamedPODSpecs, S extends StatementMap> {
  gpcVersion: number;
  groupSpec: PODGroupSpec<P, S>;
}

export function proofRequest<P extends NamedPODSpecs, S extends StatementMap>(
  spec: PODGroupSpec<P, S>
) {
  return spec;
}
