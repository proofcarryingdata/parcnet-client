import { CryptographicSchema } from "./cryptographic.js";
import { EdDSAPublicKeySchema } from "./eddsa_pubkey.js";
import { IntSchema } from "./int.js";
import { StringSchema } from "./string.js";

export interface OptionalSchema {
  type: "optional";
  innerType:
    | StringSchema
    | CryptographicSchema
    | IntSchema
    | EdDSAPublicKeySchema;
}

export type DefinedEntrySchema =
  | StringSchema
  | CryptographicSchema
  | IntSchema
  | EdDSAPublicKeySchema;

export type EntrySchema = DefinedEntrySchema | OptionalSchema;
