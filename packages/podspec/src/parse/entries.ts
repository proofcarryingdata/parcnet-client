import type { PODEntries, PODValue } from "@pcd/pod";
import { checkPODName } from "@pcd/pod/podChecks";
import type {
  PodspecBaseIssue,
  PodspecInvalidEntryNameIssue,
  PodspecInvalidTypeIssue,
  PodspecMissingEntryIssue,
  PodspecUnexpectedInputEntryIssue
} from "../error.js";
import { IssueCode, PodspecError } from "../error.js";
import { booleanCoercer } from "../schemas/boolean.js";
import { bytesCoercer } from "../schemas/bytes.js";
import {
  checkPODCryptographicValue,
  cryptographicCoercer
} from "../schemas/cryptographic.js";
import { dateCoercer } from "../schemas/dates.js";
import {
  checkPODEdDSAPublicKeyValue,
  eddsaPublicKeyCoercer
} from "../schemas/eddsa_pubkey.js";
import type { EntriesSchema, EntriesTupleSchema } from "../schemas/entries.js";
import type { EntrySchema } from "../schemas/entry.js";
import { checkPODIntValue, intCoercer } from "../schemas/int.js";
import { nullCoercer } from "../schemas/null.js";
import { checkPODStringValue, stringCoercer } from "../schemas/string.js";
import type { EntriesOutputType } from "../type_inference.js";
import { deepFreeze } from "../utils.js";
import { parseEntry } from "./entry.js";
import type { ParseResult } from "./parse_utils.js";
import { FAILURE, SUCCESS, safeCheckTuple } from "./parse_utils.js";

const COERCERS: Record<PODValue["type"], (data: unknown) => unknown> = {
  string: stringCoercer,
  int: intCoercer,
  eddsa_pubkey: eddsaPublicKeyCoercer,
  cryptographic: cryptographicCoercer,
  boolean: booleanCoercer,
  bytes: bytesCoercer,
  date: dateCoercer,
  null: nullCoercer
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

const VALID_ENTRY_SCHEMA_TYPES = [
  "int",
  "string",
  "cryptographic",
  "eddsa_pubkey",
  "optional"
] as const;

type ValidEntrySchemaType = (typeof VALID_ENTRY_SCHEMA_TYPES)[number];

// Type assertion to ensure ValidEntrySchemaType matches EntrySchema["type"]
type AssertEntrySchemaType = ValidEntrySchemaType extends EntrySchema["type"]
  ? EntrySchema["type"] extends ValidEntrySchemaType
    ? true
    : false
  : false;

// This will cause a compile-time error if the types don't match
const _: AssertEntrySchemaType = true;

// Runtime check function
function isValidEntryType(type: string): type is EntrySchema["type"] {
  return (VALID_ENTRY_SCHEMA_TYPES as readonly string[]).includes(type);
}

/**
 * A specification for a set of entries.
 */
export class EntriesSpec<const E extends EntriesSchema> {
  /**
   * The schema for this set of entries.
   * This is public so that it can be used to create new schemas, but the
   * object is frozen and so cannot be mutated.
   */
  public readonly schema: E;
  /**
   * The constructor is private - see {@link create} for public construction.
   *
   * @param schema The schema to use for this set of entries.
   */
  private constructor(schema: E) {
    for (const [name, entry] of Object.entries(schema)) {
      const entryType =
        entry.type === "optional" ? entry.innerType.type : entry.type;
      if (!isValidEntryType(entryType)) {
        throw new Error(
          `Entry ${name} contains invalid entry type: ${entryType as string}`
        );
      }
    }
    this.schema = deepFreeze(structuredClone(schema));
  }

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

  // public cloneSchema(): E;
  // public cloneSchema<R extends E>(modify: (schema: E) => R): R;
  // public cloneSchema<R extends E>(modify?: (schema: E) => R): E | R {
  //   const clonedSchema = structuredClone(this.schema);
  //   if (modify) {
  //     return modify(clonedSchema);
  //   }
  //   return clonedSchema;
  // }

  /**
   * Creates an EntriesSpec object from a given schema.
   *
   * @param schema The schema to use for this set of entries.
   * @returns A new EntriesSpec object
   */
  public static create<const E extends EntriesSchema>(
    schema: E
  ): EntriesSpec<E> {
    return new EntriesSpec(schema);
  }
}

/**
 * Exported creation function, for convenience.
 */
export const entries = <const E extends EntriesSchema>(schema: E) =>
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
