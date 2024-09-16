import type { CryptographicSchema } from "./cryptographic.js";
import type { EdDSAPublicKeySchema } from "./eddsa_pubkey.js";
import type { IntSchema } from "./int.js";
import type { StringSchema } from "./string.js";

/**
 * Union of schemas for non-optional entries.
 */
export type DefinedEntrySchema =
  | StringSchema
  | CryptographicSchema
  | IntSchema
  | EdDSAPublicKeySchema;

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
