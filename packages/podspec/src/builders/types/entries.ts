import type { PODName, PODValue } from "@pcd/pod";

export type PODValueType = PODValue["type"];

export type EntryTypes = Record<PODName, PODValueType>;

export type EntryKeys<E extends EntryTypes> = (keyof E & string)[];

export type PODValueTupleForNamedEntries<
  E extends EntryTypes,
  Names extends EntryKeys<E>
> = {
  [K in keyof Names]: PODValueTypeFromTypeName<E[Names[K] & keyof E]>;
};

export type PODValueTypeFromTypeName<T extends PODValueType> = Extract<
  PODValue,
  { type: T }
>["value"];

export type EntriesOfType<E extends EntryTypes, T extends PODValueType> = {
  [P in keyof E as E[P] extends T ? P & string : never]: E[P];
};

export type VirtualEntries = {
  $contentID: { type: "string" };
  $signature: { type: "string" };
  $signerPublicKey: { type: "eddsa_pubkey" };
};
