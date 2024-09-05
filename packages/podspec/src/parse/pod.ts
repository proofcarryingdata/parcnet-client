import { POD, PODContent, PODEntries, PODValue } from "@pcd/pod";
import {
  IssueCode,
  PodspecError,
  PodspecSignatureExcludedByListIssue,
  PodspecSignatureNotInListIssue,
  PodspecSignerExcludedByListIssue,
  PodspecSignerNotInListIssue
} from "../error.js";
import { EntriesSchema } from "../schemas/entries.js";
import { PODSchema, PODTupleSchema } from "../schemas/pod.js";
import {
  DEFAULT_ENTRIES_PARSE_OPTIONS,
  EntriesOutputType,
  EntriesParseOptions,
  safeParseEntries
} from "./entries.js";
import { FAILURE, ParseResult, safeCheckTuple, SUCCESS } from "./parseUtils.js";

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
export interface StrongPOD<T extends PODEntries> extends POD {
  content: StrongPODContent<T>;
}

export class PodSpec<E extends EntriesSchema> {
  private constructor(public readonly schema: PODSchema<E>) {}

  public safeParse(
    input: POD,
    options: EntriesParseOptions<E> = DEFAULT_ENTRIES_PARSE_OPTIONS,
    path: string[] = []
  ): ParseResult<StrongPOD<EntriesOutputType<E>>> {
    return safeParsePod(this.schema, input, options, path);
  }

  public parse(
    input: POD,
    options: EntriesParseOptions<E> = DEFAULT_ENTRIES_PARSE_OPTIONS,
    path: string[] = []
  ): StrongPOD<EntriesOutputType<E>> {
    const result = this.safeParse(input, options, path);
    if (result.isValid) {
      return result.value;
    } else {
      throw new PodspecError(result.issues);
    }
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
  options: EntriesParseOptions<E> = DEFAULT_ENTRIES_PARSE_OPTIONS,
  path: string[] = []
): ParseResult<StrongPOD<EntriesOutputType<E>>> {
  const entriesResult = safeParseEntries(
    schema.entries,
    data.content.asEntries(),
    options,
    [...path, "entries"]
  );

  if (!entriesResult.isValid) {
    return FAILURE(entriesResult.issues);
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
      const tupleSchema: PODTupleSchema<E> = schema.tuples[
        tupleIndex
      ] as PODTupleSchema<E>;

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
          return FAILURE(result.issues);
        } else {
          issues.push(...result.issues);
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
