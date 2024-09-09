import { checkPODName, PODEntries, PODValue } from "@pcd/pod";
import {
  IssueCode,
  PodspecBaseIssue,
  PodspecError,
  PodspecInvalidEntryNameIssue,
  PodspecInvalidTypeIssue,
  PodspecMissingEntryIssue,
  PodspecUnexpectedInputEntryIssue
} from "../error.js";
import {
  checkPODCryptographicValue,
  cryptographicCoercer
} from "../schemas/cryptographic.js";
import {
  checkPODEdDSAPublicKeyValue,
  eddsaPublicKeyCoercer
} from "../schemas/eddsa_pubkey.js";
import { EntriesSchema, EntriesTupleSchema } from "../schemas/entries.js";
import {
  DefinedEntrySchema,
  EntrySchema,
  OptionalSchema
} from "../schemas/entry.js";
import { checkPODIntValue, intCoercer } from "../schemas/int.js";
import { checkPODStringValue, stringCoercer } from "../schemas/string.js";
import { parseEntry } from "./entry.js";
import {
  FAILURE,
  ParseResult,
  PODValueNativeTypes,
  safeCheckTuple,
  SUCCESS
} from "./parseUtils.js";

const COERCERS: Record<PODValue["type"], (data: unknown) => unknown> = {
  string: stringCoercer,
  int: intCoercer,
  eddsa_pubkey: eddsaPublicKeyCoercer,
  cryptographic: cryptographicCoercer
};

const TYPE_VALIDATORS = {
  string: checkPODStringValue,
  int: checkPODIntValue,
  eddsa_pubkey: checkPODEdDSAPublicKeyValue,
  cryptographic: checkPODCryptographicValue
};

/**
 * Options controlling how parsing of entries is performed.
 */
export interface EntriesParseOptions<E extends EntriesSchema> {
  // Exit as soon as the first issue is encountered, useful when you just want
  // to validate if some data is correct
  exitEarly?: boolean;
  // Reject entries in the input which are not in the schema
  strict?: boolean;
  // Allow certain JavaScript types as inputs, where conversion to PODValue is
  // straightforward
  coerce?: boolean;
  // Tuples to check against the entries provided.
  tuples?: EntriesTupleSchema<E>[];
}

/**
 * A specification for a set of entries.
 */
export class EntriesSpec<E extends EntriesSchema> {
  /**
   * The constructor is private - see {@link create} for public construction.
   *
   * @param schema The schema to use for this set of entries.
   */
  private constructor(public readonly schema: E) {}

  /**
   * Parse entries without throwing an exception.
   *
   * @param input A record of string keys to PODValues, strings, bigints or numbers.
   * @param options Options controlling how parsing of entries is performed.
   * @param path The path leading to this object.
   * @returns A ParseResult containing either a valid result or list of issues.
   */
  public safeParse(
    input: Record<string, PODValue | string | bigint | number>,
    options: EntriesParseOptions<E> = DEFAULT_ENTRIES_PARSE_OPTIONS,
    path: string[] = []
  ): ParseResult<EntriesOutputType<E>> {
    return safeParseEntries(this.schema, input, options, path);
  }

  /**
   * As {@link safeParse} but will throw an exception if errors are encountered.
   */
  public parse(
    input: Record<string, PODValue | string | bigint | number>,
    options: EntriesParseOptions<E> = DEFAULT_ENTRIES_PARSE_OPTIONS,
    path: string[] = []
  ): EntriesOutputType<E> {
    const result = this.safeParse(input, options, path);
    if (result.isValid) {
      return result.value;
    } else {
      throw new PodspecError(result.issues);
    }
  }

  /**
   * Creates an EntriesSpec object from a given schema.
   *
   * @param schema The schema to use for this set of entries.
   * @returns A new EntriesSpec object
   */
  public static create<E extends EntriesSchema>(schema: E): EntriesSpec<E> {
    return new EntriesSpec(schema);
  }
}

/**
 * Exported creation function, for convenience.
 */
export const entries = <E extends EntriesSchema>(schema: E) =>
  EntriesSpec.create(schema);

/**
 * Default entries parsing options.
 */
export const DEFAULT_ENTRIES_PARSE_OPTIONS: EntriesParseOptions<EntriesSchema> =
  {
    exitEarly: false,
    strict: false,
    coerce: false
  } as const;

/**
 * Parser function for entries.
 *
 * @param schema The schema for the entries
 * @param input Input values for parsing
 * @param options Options controlling how parsing of entries is performed.
 * @param path The path leading to this object.
 * @returns A ParseResult containing either a valid result or list of issues.
 */
export function safeParseEntries<E extends EntriesSchema>(
  schema: E,
  input: Record<string, PODValue | string | bigint | number>,
  options: EntriesParseOptions<E> = DEFAULT_ENTRIES_PARSE_OPTIONS,
  path: string[] = []
): ParseResult<EntriesOutputType<E>> {
  if (typeof input !== "object" || input === null) {
    const issue: PodspecInvalidTypeIssue = {
      code: IssueCode.invalid_type,
      expectedType: "PODEntries",
      path
    };
    return FAILURE([issue]);
  }

  const output: PODEntries = {};
  const issues: PodspecBaseIssue[] = [];

  for (const [name, entry] of Object.entries(schema)) {
    const isOptional = entry.type === "optional";

    if (!(name in input) && !isOptional) {
      const issue: PodspecMissingEntryIssue = {
        code: IssueCode.missing_entry,
        key: name,
        path: [...path, name]
      };
      issues.push(issue);
      if (options.exitEarly) {
        return FAILURE(issues);
      }
    }
  }

  for (const [key, value] of Object.entries(input)) {
    if (!(key in schema)) {
      if (options.strict) {
        const issue: PodspecUnexpectedInputEntryIssue = {
          code: IssueCode.unexpected_input_entry,
          name: key,
          path: [...path, key]
        };
        if (options.exitEarly) {
          return FAILURE([issue]);
        } else {
          issues.push(issue);
        }
      } else {
        continue;
      }
    }

    const entryPath = [...path, key];
    try {
      // Will throw if the key is invalid
      checkPODName(key);
    } catch (e) {
      const issue: PodspecInvalidEntryNameIssue = {
        code: IssueCode.invalid_entry_name,
        name: key,
        description: (e as Error).message,
        path: entryPath
      };
      issues.push(issue);
      if (options.exitEarly) {
        return FAILURE(issues);
      }
    }

    let entrySchema: EntrySchema = schema[key]!;
    if (entrySchema.type === "optional") {
      entrySchema = entrySchema.innerType;
    }
    const result = parseEntry(
      entrySchema,
      value,
      options,
      entryPath,
      TYPE_VALIDATORS[entrySchema.type],
      COERCERS[entrySchema.type]
    );
    if (!result.isValid) {
      if (options.exitEarly) {
        return FAILURE(result.issues);
      } else {
        issues.push(...result.issues);
      }
    } else {
      output[key] = result.value;
    }
  }

  if (options.tuples) {
    for (const [tupleIndex, tupleSchema] of options.tuples.entries()) {
      const result = safeCheckTuple(output, tupleSchema, options, [
        ...path,
        "$tuples",
        tupleIndex.toString()
      ]);

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
    : SUCCESS(output as EntriesOutputType<E>);
}

/**
 * Gets the output type for entries matching a given schema.
 * The output type is a record mapping string keys to PODValues, and is
 * therefore similar to {@link PODEntries}, but is specific about the values
 * that certain entries ought to have.
 */
export type EntriesOutputType<E extends EntriesSchema> = AddQuestionMarks<{
  [k in keyof E]: E[k] extends DefinedEntrySchema
    ? {
        type: E[k]["type"];
        value: PODValueNativeTypes[E[k]["type"]];
      }
    : E[k] extends OptionalSchema
      ?
          | {
              type: E[k]["innerType"]["type"];
              value: PODValueNativeTypes[E[k]["innerType"]["type"]];
            }
          | undefined
      : never;
}>;
type optionalKeys<T extends object> = {
  [k in keyof T]: undefined extends T[k] ? k : never;
}[keyof T];
type requiredKeys<T extends object> = {
  [k in keyof T]: undefined extends T[k] ? never : k;
}[keyof T];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AddQuestionMarks<T extends object, _O = any> = {
  [K in requiredKeys<T>]: T[K];
} & {
  [K in optionalKeys<T>]?: T[K];
};
