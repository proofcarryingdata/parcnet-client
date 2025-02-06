import type { ValidationIssue } from "./issues.js";

export type ValidateSuccess<T> = {
  value: T;
  isValid: true;
};

export type ValidateFailure = {
  issues: ValidationIssue[];
  isValid: false;
};

export type ValidateResult<T> = ValidateSuccess<T> | ValidateFailure;
