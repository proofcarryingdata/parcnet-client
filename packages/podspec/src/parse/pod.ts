import type { POD, PODContent, PODEntries, PODValue } from "@pcd/pod";
import type {
  PodspecSignatureExcludedByListIssue,
  PodspecSignatureNotInListIssue,
  PodspecSignerExcludedByListIssue,
  PodspecSignerNotInListIssue
} from "../error.js";
import { IssueCode, PodspecError } from "../error.js";
import type {
  ProofConfigOwner,
  ProofConfigPODSchema
} from "../gpc/proof_request.js";
import type { EntriesSchema } from "../schemas/entries.js";
import type { PODSchema } from "../schemas/pod.js";
import type { EntriesOutputType } from "../type_inference.js";
import type { EntriesParseOptions } from "./entries.js";
import {
  DEFAULT_ENTRIES_PARSE_OPTIONS,
  EntriesSpec,
  safeParseEntries
} from "./entries.js";
import type { ParseResult } from "./parse_utils.js";
import { FAILURE, SUCCESS, safeCheckTuple } from "./parse_utils.js";

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

type SchemaIdentityFn = <E extends EntriesSchema>(
  s: PODSchema<E>
) => PODSchema<E>;

/**
 * A PodSpec is a specification for a POD, including its schema and any
 * additional constraints.
 */
export class PodSpec<const E extends EntriesSchema = EntriesSchema> {
  public schema: PODSchema<E>;

  /**
   * Create a new PodSpec. The constructor is private, see {@link create} for
   * public creation.
   *
   * @param schema The schema for the POD.
   */
  private constructor(schema: PODSchema<E>) {
    this.schema = Object.freeze(schema);
  }

  /**
   * Parse a POD according to this PodSpec.
   * Returns a {@link ParseResult} rather than throwing an exception.
   *
   * @param input The POD to parse.
   * @param options The options to use when parsing.
   * @param path The path to use when parsing.
   * @returns A result containing either a valid value or a list of errors.
   */
  public safeParse(
    input: POD,
    options: EntriesParseOptions<E> = DEFAULT_ENTRIES_PARSE_OPTIONS,
    path: string[] = []
  ): ParseResult<StrongPOD<EntriesOutputType<E>>> {
    return safeParsePod(this.schema, input, options, path);
  }

  /**
   * Identical to {@link safeParse}, except it throws an exception if errors
   * are found, rather than returning a {@link ParseResult}.
   *
   * @param input The POD to parse.
   * @param options The options to use when parsing.
   * @param path The path to use when parsing.
   * @returns The parsed POD.
   */
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

  /**
   * Parse input data as PODEntries according to this PodSpec's schema.
   * Returns a {@link ParseResult} rather than throwing an exception.
   *
   * @param input The entries to parse.
   * @param options The options to use when parsing.
   * @param path The path to use when parsing.
   * @returns A result containing either a valid value or a list of errors.
   */
  public safeParseEntries(
    input: Record<string, PODValue | string | bigint | number>,
    options: EntriesParseOptions<E> = DEFAULT_ENTRIES_PARSE_OPTIONS,
    path: string[] = []
  ): ParseResult<EntriesOutputType<E>> {
    return EntriesSpec.create(this.schema.entries as E).safeParse(
      input,
      options,
      path
    );
  }

  /**
   * Identical to {@link safeParseEntries}, except it throws an exception if errors
   * are found, rather than returning a {@link ParseResult}.
   *
   * @param input The entries to parse.
   * @param options The options to use when parsing.
   * @param path The path to use when parsing.
   * @returns The parsed entries.
   */
  public parseEntries(
    input: Record<string, PODValue | string | bigint | number>,
    options: EntriesParseOptions<E> = DEFAULT_ENTRIES_PARSE_OPTIONS,
    path: string[] = []
  ): EntriesOutputType<E> {
    const result = this.safeParseEntries(input, options, path);
    if (result.isValid) {
      return result.value;
    } else {
      throw new PodspecError(result.issues);
    }
  }

  /**
   * Tests an array of PODs against this Podspec.
   * Useful for query-like operations where you need to find the matching PODs
   * from a list.
   *
   * @param input The PODs to test
   * @returns An array of matches and their indexes within the input array.
   */
  public query(input: POD[]): {
    matches: StrongPOD<EntriesOutputType<E>>[];
    matchingIndexes: number[];
  } {
    const matchingIndexes: number[] = [];
    const matches: StrongPOD<EntriesOutputType<E>>[] = [];
    const signatures = new Set<string>();
    for (const [index, pod] of input.entries()) {
      const result = this.safeParse(pod, { exitEarly: true });
      if (result.isValid) {
        if (signatures.has(result.value.signature)) {
          continue;
        }
        signatures.add(result.value.signature);
        matchingIndexes.push(index);
        matches.push(result.value);
      }
    }
    return {
      matches,
      matchingIndexes
    };
  }

  /**
   * Extends the current PodSpec with a new schema.
   *
   * The "updater" function is provided by the caller, and is responsible for
   * creating a new schema. It is passed a clone of current schema and a
   * function which, strictly speaking, does nothing and is used only to
   * enforce types. In the updater function, the caller should return the
   * result of calling `f` on the updated schema.
   *
   * @param updater A function which takes the current schema and returns a new schema.
   * @returns A new PodSpec with the extended schema.
   */
  public extend<const R extends EntriesSchema>(
    updater: (schema: PODSchema<E>, f: SchemaIdentityFn) => PODSchema<R>
  ): PodSpec<R> {
    const clone = structuredClone(this.schema);
    const newSchema = updater(clone, (s) => s);
    return PodSpec.create(newSchema);
  }

  public cloneSchema(): PODSchema<E> {
    return structuredClone(this.schema);
  }

  public proofConfig({
    revealed,
    owner
  }: {
    revealed?: Partial<
      Record<keyof (E & { $signerPublicKey: never }), boolean>
    >;
    owner?: ProofConfigOwner<E>;
  }): ProofConfigPODSchema<E> {
    return {
      pod: this.schema,
      revealed,
      owner
    };
  }

  /**
   * Creates a new PodSpec instance.
   *
   * @param schema The schema defining the valid POD.
   * @returns A new PodSpec instance.
   */
  public static create<const E extends EntriesSchema>(
    schema: PODSchema<E>
  ): PodSpec<E> {
    return new PodSpec(schema);
  }
}

/**
 * Exported version of static create method, for convenience.
 */
export const pod = <const E extends EntriesSchema>(schema: PODSchema<E>) =>
  PodSpec.create(schema);

/**
 * Parses the POD and its entries, returning a {@link ParseResult}.
 *
 * @param schema The schema defining the valid POD.
 * @param data A POD.
 * @param options Options determining how parsing is performed.
 * @param path The path to this object.
 * @returns A result containing either a valid value or a list of errors.
 */
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
    for (const [tupleIndex, tupleSchema] of schema.tuples.entries()) {
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
        [...path, "$tuples", tupleIndex.toString()]
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
