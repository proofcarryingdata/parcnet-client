import type { BooleanSchema } from "./boolean.js";
import type { BytesSchema } from "./bytes.js";
import type { CryptographicSchema } from "./cryptographic.js";
import type { DateSchema } from "./dates.js";
import type { EdDSAPublicKeySchema } from "./eddsa_pubkey.js";
import type { IntSchema } from "./int.js";
import type { NullSchema } from "./null.js";
import type { StringSchema } from "./string.js";

/**
 * Union of schemas for non-optional entries.
 */
export type DefinedEntrySchema =
  | StringSchema
  | CryptographicSchema
  | IntSchema
  | EdDSAPublicKeySchema
  | BooleanSchema
  | BytesSchema
  | DateSchema
  | NullSchema;

/**
 * Schema for an optional entry.
 */
export interface OptionalSchema {
  type: "optional";
  innerType: DefinedEntrySchema;
}

/**
 * Union of schemas for entries.
 */
export type EntrySchema = DefinedEntrySchema | OptionalSchema;
