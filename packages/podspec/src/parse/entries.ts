import { checkPODName, PODEntries, PODValue } from "@pcd/pod";
import {
  IssueCode,
  PodspecError,
  PodspecInvalidEntryNameIssue,
  PodspecInvalidTypeIssue,
  PodspecIssue,
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

export interface EntriesParseOptions<E extends EntriesSchema> {
  // Exit as soon as the first issue is encountered, useful when you just want
  // to validate if some data is correct
  exitEarly?: boolean;
  // Reject entries in the input which are not in the schema
  strict?: boolean;
  // Allow certain JavaScript types as inputs, where conversion to PODValue is
  // straightforward
  coerce?: boolean;
  tuples?: EntriesTupleSchema<E>[];
}

export class EntriesSpec<E extends EntriesSchema> {
  private constructor(public readonly schema: E) {}

  public safeParse(
    input: Record<string, PODValue | string | bigint | number>,
    options: EntriesParseOptions<E> = DEFAULT_ENTRIES_PARSE_OPTIONS,
    path: string[] = []
  ): ParseResult<EntriesOutputType<E>> {
    return safeParseEntries(this.schema, input, options, path);
  }

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

  public static create<E extends EntriesSchema>(schema: E): EntriesSpec<E> {
    return new EntriesSpec(schema);
  }
}

export const entries = EntriesSpec.create;

export const DEFAULT_ENTRIES_PARSE_OPTIONS: EntriesParseOptions<EntriesSchema> =
  {
    exitEarly: false,
    strict: false,
    coerce: false
  } as const;

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
  const issues: PodspecIssue[] = [];

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

    let entrySchema: EntrySchema = schema[key] as EntrySchema;
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
    const tuples = options.tuples as EntriesTupleSchema<E>[];
    for (const tupleIndex in tuples) {
      const tupleSchema = tuples[tupleIndex] as EntriesTupleSchema<E>;

      const result = safeCheckTuple(output, tupleSchema, options, [
        ...path,
        "$tuples",
        tupleIndex
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
export type requiredKeys<T extends object> = {
  [k in keyof T]: undefined extends T[k] ? never : k;
}[keyof T];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AddQuestionMarks<T extends object, _O = any> = {
  [K in requiredKeys<T>]: T[K];
} & {
  [K in optionalKeys<T>]?: T[K];
};
