import type {
  PODBytesValue,
  PODCryptographicValue,
  PODDateValue,
  PODEdDSAPublicKeyValue,
  PODIntValue,
  PODBooleanValue,
  PODNullValue,
  PODStringValue,
  PODName
} from "@pcd/pod";

export interface StringEntrySpec {
  type: "string";
  isMemberOf?: PODStringValue[];
  isNotMemberOf?: PODStringValue[];
}

export interface BytesEntrySpec {
  type: "bytes";
  isMemberOf?: PODBytesValue[];
  isNotMemberOf?: PODBytesValue[];
}

export interface IntEntrySpec {
  type: "int";
  isMemberOf?: PODIntValue[];
  isNotMemberOf?: PODIntValue[];
  inRange?: { min: bigint; max: bigint };
}

export interface CryptographicEntrySpec {
  type: "cryptographic";
  isMemberOf?: PODCryptographicValue[];
  isNotMemberOf?: PODCryptographicValue[];
  inRange?: { min: bigint; max: bigint };
  isOwnerID?: "SemaphoreV3"; // @todo constant from GPC?
}

export interface EdDSAPublicKeyEntrySpec {
  type: "eddsa_pubkey";
  isMemberOf?: PODEdDSAPublicKeyValue[];
  isNotMemberOf?: PODEdDSAPublicKeyValue[];
  isOwnerID?: "SemaphoreV4"; // @todo constant from GPC?
}

export interface BooleanEntrySpec {
  type: "boolean";
  isMemberOf?: PODBooleanValue[];
  isNotMemberOf?: PODBooleanValue[];
}

export interface DateEntrySpec {
  type: "date";
  isMemberOf?: PODDateValue[];
  isNotMemberOf?: PODDateValue[];
}

export interface NullEntrySpec {
  type: "null";
  isMemberOf?: PODNullValue[];
  isNotMemberOf?: PODNullValue[];
}

/**
 * Union of non-optional entries.
 */
export type DefinedEntrySpec =
  | StringEntrySpec
  | CryptographicEntrySpec
  | IntEntrySpec
  | EdDSAPublicKeyEntrySpec
  | BooleanEntrySpec
  | BytesEntrySpec
  | DateEntrySpec
  | NullEntrySpec;

/**
 * Optional entry wrapper.
 */
export interface OptionalEntrySpec {
  type: "optional";
  innerType: DefinedEntrySpec;
}

/**
 * Union of all entry types.
 */
export type EntrySpec = DefinedEntrySpec | OptionalEntrySpec;

/**
 * Spec for a PODEntries object - simply a keyed collection of EntrySpecs.
 */
export type EntryListSpec = Readonly<Record<PODName, DefinedEntrySpec>>;

export type EntriesSpec<E extends EntryListSpec> = {
  entries: E;
};
