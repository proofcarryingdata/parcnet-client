type JsonPrimitive = string | number | boolean | null;
type JsonArray = JsonSafe[];
// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
type JsonObject = { [key: string]: JsonSafe };
type JsonSafe = JsonPrimitive | JsonArray | JsonObject;

/**
 * Type helper that checks if a type is JSON-safe.
 * Returns true if the type only contains JSON-safe values,
 * false if it contains any non-JSON-safe values like undefined, bigint, Date, etc.
 */
export type IsJsonSafe<T> = T extends JsonSafe ? true : false;
