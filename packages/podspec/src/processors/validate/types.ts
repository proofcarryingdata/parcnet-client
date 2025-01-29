import type { ValidationBaseIssue } from "./issues.js";

export type ValidateSuccess<T> = {
  value: T;
  isValid: true;
};

export type ValidateFailure = {
  issues: ValidationBaseIssue[];
  isValid: false;
};

export type ValidateResult<T> = ValidateSuccess<T> | ValidateFailure;
