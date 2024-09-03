import { POD, PODContent, PODEntries, PODValue } from "@pcd/pod";
import {
  IssueCode,
  PodspecSignatureExcludedByListIssue,
  PodspecSignatureNotInListIssue,
  PodspecSignerExcludedByListIssue,
  PodspecSignerNotInListIssue
} from "../error";
import { EntriesSchema } from "../schemas/entries";
import { PODSchema } from "../schemas/pod";
import {
  DEFAULT_ENTRIES_PARSE_OPTIONS,
  EntriesOutputType,
  EntriesParseOptions,
  safeParseEntries
} from "./entries";
import { FAILURE, ParseResult, safeCheckTuple, SUCCESS } from "./parseUtils";

/**
 * "Strong" PODContent is an extension of PODContent which extends the
 * `asEntries()` method to return a strongly-typed PODEntries.
 */
interface StrongPODContent<T extends PODEntries> extends PODContent {
  asEntries(): T;
}

/**
 * A "strong" POD is a POD with a strongly-typed entries.
 */
interface StrongPOD<T extends PODEntries> extends POD {
  content: StrongPODContent<T>;
}

export class PodSpec<E extends EntriesSchema> {
  private constructor(public readonly schema: PODSchema<E>) {}

  public safeParse(
    input: POD,
    options: EntriesParseOptions = DEFAULT_ENTRIES_PARSE_OPTIONS,
    path: string[] = []
  ): ParseResult<StrongPOD<EntriesOutputType<E>>> {
    return safeParsePod(this.schema, input, options, path);
  }

  public query(input: POD[]): { matches: POD[]; matchingIndexes: number[] } {
    const matchingIndexes: number[] = [];
    const matches: POD[] = [];
    for (const [index, pod] of input.entries()) {
      const result = this.safeParse(pod, { exitEarly: true });
      if (result.isValid) {
        matchingIndexes.push(index);
        matches.push(pod);
      }
    }
    return {
      matches,
      matchingIndexes
    };
  }

  public static create<E extends EntriesSchema>(
    schema: PODSchema<E>
  ): PodSpec<E> {
    return new PodSpec(schema);
  }
}

export const pod = PodSpec.create;

export function safeParsePod<E extends EntriesSchema>(
  schema: PODSchema<E>,
  data: POD,
  options: EntriesParseOptions = DEFAULT_ENTRIES_PARSE_OPTIONS,
  path: string[] = []
): ParseResult<StrongPOD<EntriesOutputType<E>>> {
  const entriesResult = safeParseEntries(
    schema.entries,
    data.content.asEntries(),
    options,
    [...path, "entries"]
  );

  if (!entriesResult.isValid) {
    return FAILURE(entriesResult.errors);
  }

  const issues = [];

  if (schema.signature) {
    const { isMemberOf, isNotMemberOf } = schema.signature;
    if (isMemberOf && !isMemberOf.includes(data.signature)) {
      const issue: PodspecSignatureNotInListIssue = {
        code: IssueCode.signature_not_in_list,
        signature: data.signature,
        list: isMemberOf,
        path
      };
      if (options.exitEarly) {
        return FAILURE([issue]);
      } else {
        issues.push(issue);
      }
    }

    if (
      isNotMemberOf &&
      isNotMemberOf.length > 0 &&
      isNotMemberOf.includes(data.signature)
    ) {
      const issue: PodspecSignatureExcludedByListIssue = {
        code: IssueCode.signature_excluded_by_list,
        signature: data.signature,
        list: isNotMemberOf,
        path
      };
      if (options.exitEarly) {
        return FAILURE([issue]);
      } else {
        issues.push(issue);
      }
    }
  }

  if (schema.signerPublicKey) {
    const { isMemberOf, isNotMemberOf } = schema.signerPublicKey;
    if (isMemberOf && !isMemberOf.includes(data.signerPublicKey)) {
      const issue: PodspecSignerNotInListIssue = {
        code: IssueCode.signer_not_in_list,
        signer: data.signerPublicKey,
        list: isMemberOf,
        path
      };
      if (options.exitEarly) {
        return FAILURE([issue]);
      } else {
        issues.push(issue);
      }
    }

    if (
      isNotMemberOf &&
      isNotMemberOf.length > 0 &&
      isNotMemberOf.includes(data.signerPublicKey)
    ) {
      const issue: PodspecSignerExcludedByListIssue = {
        code: IssueCode.signer_excluded_by_list,
        signer: data.signerPublicKey,
        list: isNotMemberOf,
        path
      };
      if (options.exitEarly) {
        return FAILURE([issue]);
      } else {
        issues.push(issue);
      }
    }
  }

  if (schema.tuples) {
    for (const tupleIndex in schema.tuples) {
      const tupleSchema = schema.tuples[tupleIndex];

      const result = safeCheckTuple(
        {
          ...entriesResult.value,
          $signerPublicKey: {
            type: "eddsa_pubkey",
            value: data.signerPublicKey
          }
        } as Record<string, PODValue>,
        tupleSchema,
        options,
        [...path, "$tuples", tupleIndex]
      );

      if (!result.isValid) {
        if (options.exitEarly) {
          return FAILURE(result.errors);
        } else {
          issues.push(...result.errors);
        }
      }
    }
  }

  return issues.length > 0
    ? FAILURE(issues)
    : SUCCESS(
        // We can return the POD as is, since we know it matches the spec, but
        //with a type that tells TypeScript what entries it has
        data as StrongPOD<EntriesOutputType<E>>
      );
}
