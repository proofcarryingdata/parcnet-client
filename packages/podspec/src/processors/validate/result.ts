import type { ValidationBaseIssue } from "./issues.js";
import type { ValidateFailure, ValidateSuccess } from "./types.js";

/**
 * Creates a ValidateFailure containing a list of issues.
 *
 * @param errors The issues to include in the failure.
 * @returns A ValidateFailure containing the issues.
 */
export function FAILURE(errors: ValidationBaseIssue[]): ValidateFailure {
  return { isValid: false, issues: errors ?? [] };
}

/**
 * Creates a ValidateSuccess containing a valid value.
 *
 * @param value The value to include in the success.
 * @returns A ValidateSuccess containing the value.
 */
export function SUCCESS<T>(value: T): ValidateSuccess<T> {
  return {
    isValid: true,
    value
  };
}
