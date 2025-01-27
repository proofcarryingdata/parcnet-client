import type {
  PODName,
  PODBytesValue,
  PODCryptographicValue,
  PODDateValue,
  PODEdDSAPublicKeyValue,
  PODIntValue,
  PODBooleanValue,
  PODNullValue,
  PODStringValue
} from "@pcd/pod";

/**
 * Schema for a PODStringValue.
 */
export interface StringSchema {
  type: "string";
  isMemberOf?: PODStringValue[];
  isNotMemberOf?: PODStringValue[];
  equalsEntry?: PODName;
}

/**
 * Schema for a PODBytesValue.
 */
export interface BytesSchema {
  type: "bytes";
  isMemberOf?: PODBytesValue[];
  isNotMemberOf?: PODBytesValue[];
  equalsEntry?: PODName;
}

/**
 * Schema for a PODIntValue.
 */
export interface IntSchema {
  type: "int";
  isMemberOf?: PODIntValue[];
  isNotMemberOf?: PODIntValue[];
  equalsEntry?: PODName;
  inRange?: { min: bigint; max: bigint };
}

/**
 * Schema for a PODCryptographicValue.
 */
export interface CryptographicSchema {
  type: "cryptographic";
  isMemberOf?: PODCryptographicValue[];
  isNotMemberOf?: PODCryptographicValue[];
  equalsEntry?: PODName;
  inRange?: { min: bigint; max: bigint };
  isOwnerID?: boolean;
}

/**
 * Schema for a PODEdDSAPublicKeyValue.
 */
export interface EdDSAPublicKeySchema {
  type: "eddsa_pubkey";
  isMemberOf?: PODEdDSAPublicKeyValue[];
  isNotMemberOf?: PODEdDSAPublicKeyValue[];
  equalsEntry?: PODName;
}

/**
 * Schema for a PODBooleanValue.
 */
export interface BooleanSchema {
  type: "boolean";
  isMemberOf?: PODBooleanValue[];
  isNotMemberOf?: PODBooleanValue[];
}

/**
 * Schema for a PODDateValue.
 */
export interface DateSchema {
  type: "date";
  isMemberOf?: PODDateValue[];
  isNotMemberOf?: PODDateValue[];
  equalsEntry?: PODName;
}

/**
 * Schema for a PODNullValue.
 */
export interface NullSchema {
  type: "null";
  isMemberOf?: PODNullValue[];
  isNotMemberOf?: PODNullValue[];
}

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
