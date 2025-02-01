import * as __typia_transform__assertGuard from "typia/lib/internal/_assertGuard.js";
import * as __typia_transform__accessExpressionAsString from "typia/lib/internal/_accessExpressionAsString.js";
import typia from "typia";
import type { StatementMap } from "../builders/types/statements.js";
import type { EntryTypes } from "../builders/types/entries.js";
import type { PODSpec } from "../builders/pod.js";
export const assertPODSpec = (() => {
  const _io0 = (input: any): boolean =>
    "object" === typeof input.entries &&
    null !== input.entries &&
    false === Array.isArray(input.entries) &&
    _io1(input.entries) &&
    "object" === typeof input.statements &&
      null !== input.statements &&
      false === Array.isArray(input.statements) &&
    _io2(input.statements);
  const _io1 = (input: any): boolean =>
    Object.keys(input).every((key: any) => {
      const value = input[key];
      if (undefined === value) return true;
      return (
        "string" === value ||
        "boolean" === value ||
        "bytes" === value ||
        "cryptographic" === value ||
        "int" === value ||
        "eddsa_pubkey" === value ||
        "date" === value ||
        "null" === value
      );
    });
  const _io2 = (input: any): boolean =>
    Object.keys(input).every((key: any) => {
      const value = input[key];
      if (undefined === value) return true;
      return "object" === typeof value && null !== value && _iu0(value);
    });
  const _io3 = (input: any): boolean =>
    Array.isArray(input.entries) &&
    input.entries.every((elem: any) => "string" === typeof elem) &&
    "isMemberOf" === input.type &&
    Array.isArray(input.isMemberOf) &&
    input.isMemberOf.every(
      (elem: any) =>
        Array.isArray(elem) &&
        elem.every((elem: any) => "string" === typeof elem)
    );
  const _io4 = (input: any): boolean =>
    Array.isArray(input.entries) &&
    input.entries.every((elem: any) => "string" === typeof elem) &&
    "isNotMemberOf" === input.type &&
    Array.isArray(input.isNotMemberOf) &&
    input.isNotMemberOf.every(
      (elem: any) =>
        Array.isArray(elem) &&
        elem.every((elem: any) => "string" === typeof elem)
    );
  const _io5 = (input: any): boolean =>
    "string" === typeof input.entry &&
    "inRange" === input.type &&
    "object" === typeof input.inRange && null !== input.inRange &&
    _io6(input.inRange);
  const _io6 = (input: any): boolean =>
    "string" === typeof input.min && "string" === typeof input.max;
  const _io7 = (input: any): boolean =>
    "string" === typeof input.entry &&
    "notInRange" === input.type &&
    "object" === typeof input.notInRange && null !== input.notInRange &&
    _io6(input.notInRange);
  const _io8 = (input: any): boolean =>
    "string" === typeof input.entry &&
    "equalsEntry" === input.type &&
    "string" === typeof input.otherEntry;
  const _io9 = (input: any): boolean =>
    "string" === typeof input.entry &&
    "notEqualsEntry" === input.type &&
    "string" === typeof input.otherEntry;
  const _io10 = (input: any): boolean =>
    "string" === typeof input.entry &&
    "greaterThan" === input.type &&
    "string" === typeof input.otherEntry;
  const _io11 = (input: any): boolean =>
    "string" === typeof input.entry &&
    "greaterThanEq" === input.type &&
    "string" === typeof input.otherEntry;
  const _io12 = (input: any): boolean =>
    "string" === typeof input.entry &&
    "lessThan" === input.type &&
    "string" === typeof input.otherEntry;
  const _io13 = (input: any): boolean =>
    "string" === typeof input.entry &&
    "lessThanEq" === input.type &&
    "string" === typeof input.otherEntry;
  const _iu0 = (input: any): any =>
    (() => {
      if ("isMemberOf" === input.type) return _io3(input);
      else if ("isNotMemberOf" === input.type) return _io4(input);
      else if ("inRange" === input.type) return _io5(input);
      else if ("notInRange" === input.type) return _io7(input);
      else if ("lessThanEq" === input.type) return _io13(input);
      else if ("lessThan" === input.type) return _io12(input);
      else if ("greaterThanEq" === input.type) return _io11(input);
      else if ("greaterThan" === input.type) return _io10(input);
      else if ("notEqualsEntry" === input.type) return _io9(input);
      else if ("equalsEntry" === input.type) return _io8(input);
      else return false;
    })();
  const _ao0 = (
    input: any,
    _path: string,
    _exceptionable: boolean = true
  ): boolean =>
    (((("object" === typeof input.entries &&
      null !== input.entries &&
      false === Array.isArray(input.entries)) ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".entries",
          expected: "EntryTypes",
          value: input.entries
        },
        _errorFactory
      )) &&
      _ao1(input.entries, _path + ".entries", true && _exceptionable)) ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".entries",
          expected: "EntryTypes",
          value: input.entries
        },
        _errorFactory
      )) &&
    (((("object" === typeof input.statements &&
      null !== input.statements &&
      false === Array.isArray(input.statements)) ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".statements",
          expected: "StatementMap",
          value: input.statements
        },
        _errorFactory
      )) &&
      _ao2(input.statements, _path + ".statements", true && _exceptionable)) ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".statements",
          expected: "StatementMap",
          value: input.statements
        },
        _errorFactory
      ));
  const _ao1 = (
    input: any,
    _path: string,
    _exceptionable: boolean = true
  ): boolean =>
    false === _exceptionable ||
    Object.keys(input).every((key: any) => {
      const value = input[key];
      if (undefined === value) return true;
      return (
        "string" === value ||
        "boolean" === value ||
        "bytes" === value ||
        "cryptographic" === value ||
        "int" === value ||
        "eddsa_pubkey" === value ||
        "date" === value ||
        "null" === value ||
        __typia_transform__assertGuard._assertGuard(
          _exceptionable,
          {
            method: "typia.createAssert",
            path:
              _path +
              __typia_transform__accessExpressionAsString._accessExpressionAsString(
                key
              ),
            expected:
              '("boolean" | "bytes" | "cryptographic" | "date" | "eddsa_pubkey" | "int" | "null" | "string")',
            value: value
          },
          _errorFactory
        )
      );
    });
  const _ao2 = (
    input: any,
    _path: string,
    _exceptionable: boolean = true
  ): boolean =>
    false === _exceptionable ||
    Object.keys(input).every((key: any) => {
      const value = input[key];
      if (undefined === value) return true;
      return (
        ((("object" === typeof value && null !== value) ||
          __typia_transform__assertGuard._assertGuard(
            _exceptionable,
            {
              method: "typia.createAssert",
              path:
                _path +
                __typia_transform__accessExpressionAsString._accessExpressionAsString(
                  key
                ),
              expected:
                "(EqualsEntry<any, string, string> | GreaterThan<any, string, string> | GreaterThanEq<any, string, string> | InRange<any, string> | IsMemberOf<any, Array<string>> | IsNotMemberOf<any, Array<string>> | LessThan<any, string, string> | LessThanEq<any, string, string> | NotEqualsEntry<any, string, string> | NotInRange<any, string>)",
              value: value
            },
            _errorFactory
          )) &&
          _au0(
            value,
            _path +
              __typia_transform__accessExpressionAsString._accessExpressionAsString(
                key
              ),
            true && _exceptionable
          )) ||
        __typia_transform__assertGuard._assertGuard(
          _exceptionable,
          {
            method: "typia.createAssert",
            path:
              _path +
              __typia_transform__accessExpressionAsString._accessExpressionAsString(
                key
              ),
            expected:
              "(EqualsEntry<any, string, string> | GreaterThan<any, string, string> | GreaterThanEq<any, string, string> | InRange<any, string> | IsMemberOf<any, Array<string>> | IsNotMemberOf<any, Array<string>> | LessThan<any, string, string> | LessThanEq<any, string, string> | NotEqualsEntry<any, string, string> | NotInRange<any, string>)",
            value: value
          },
          _errorFactory
        )
      );
    });
  const _ao3 = (
    input: any,
    _path: string,
    _exceptionable: boolean = true
  ): boolean =>
    (((Array.isArray(input.entries) ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".entries",
          expected: "Array<string>",
          value: input.entries
        },
        _errorFactory
      )) &&
      input.entries.every(
        (elem: any, _index7: number) =>
          "string" === typeof elem ||
          __typia_transform__assertGuard._assertGuard(
            _exceptionable,
            {
              method: "typia.createAssert",
              path: _path + ".entries[" + _index7 + "]",
              expected: "string",
              value: elem
            },
            _errorFactory
          )
      )) ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".entries",
          expected: "Array<string>",
          value: input.entries
        },
        _errorFactory
      )) &&
    ("isMemberOf" === input.type ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".type",
          expected: '"isMemberOf"',
          value: input.type
        },
        _errorFactory
      )) &&
    (((Array.isArray(input.isMemberOf) ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".isMemberOf",
          expected: "Array<Array<string>>",
          value: input.isMemberOf
        },
        _errorFactory
      )) &&
      input.isMemberOf.every(
        (elem: any, _index8: number) =>
          ((Array.isArray(elem) ||
            __typia_transform__assertGuard._assertGuard(
              _exceptionable,
              {
                method: "typia.createAssert",
                path: _path + ".isMemberOf[" + _index8 + "]",
                expected: "Array<string>",
                value: elem
              },
              _errorFactory
            )) &&
            elem.every(
              (elem: any, _index9: number) =>
                "string" === typeof elem ||
                __typia_transform__assertGuard._assertGuard(
                  _exceptionable,
                  {
                    method: "typia.createAssert",
                    path:
                      _path + ".isMemberOf[" + _index8 + "][" + _index9 + "]",
                    expected: "string",
                    value: elem
                  },
                  _errorFactory
                )
            )) ||
          __typia_transform__assertGuard._assertGuard(
            _exceptionable,
            {
              method: "typia.createAssert",
              path: _path + ".isMemberOf[" + _index8 + "]",
              expected: "Array<string>",
              value: elem
            },
            _errorFactory
          )
      )) ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".isMemberOf",
          expected: "Array<Array<string>>",
          value: input.isMemberOf
        },
        _errorFactory
      ));
  const _ao4 = (
    input: any,
    _path: string,
    _exceptionable: boolean = true
  ): boolean =>
    (((Array.isArray(input.entries) ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".entries",
          expected: "Array<string>",
          value: input.entries
        },
        _errorFactory
      )) &&
      input.entries.every(
        (elem: any, _index10: number) =>
          "string" === typeof elem ||
          __typia_transform__assertGuard._assertGuard(
            _exceptionable,
            {
              method: "typia.createAssert",
              path: _path + ".entries[" + _index10 + "]",
              expected: "string",
              value: elem
            },
            _errorFactory
          )
      )) ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".entries",
          expected: "Array<string>",
          value: input.entries
        },
        _errorFactory
      )) &&
    ("isNotMemberOf" === input.type ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".type",
          expected: '"isNotMemberOf"',
          value: input.type
        },
        _errorFactory
      )) &&
    (((Array.isArray(input.isNotMemberOf) ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".isNotMemberOf",
          expected: "Array<Array<string>>",
          value: input.isNotMemberOf
        },
        _errorFactory
      )) &&
      input.isNotMemberOf.every(
        (elem: any, _index11: number) =>
          ((Array.isArray(elem) ||
            __typia_transform__assertGuard._assertGuard(
              _exceptionable,
              {
                method: "typia.createAssert",
                path: _path + ".isNotMemberOf[" + _index11 + "]",
                expected: "Array<string>",
                value: elem
              },
              _errorFactory
            )) &&
            elem.every(
              (elem: any, _index12: number) =>
                "string" === typeof elem ||
                __typia_transform__assertGuard._assertGuard(
                  _exceptionable,
                  {
                    method: "typia.createAssert",
                    path:
                      _path +
                      ".isNotMemberOf[" +
                      _index11 +
                      "][" +
                      _index12 +
                      "]",
                    expected: "string",
                    value: elem
                  },
                  _errorFactory
                )
            )) ||
          __typia_transform__assertGuard._assertGuard(
            _exceptionable,
            {
              method: "typia.createAssert",
              path: _path + ".isNotMemberOf[" + _index11 + "]",
              expected: "Array<string>",
              value: elem
            },
            _errorFactory
          )
      )) ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".isNotMemberOf",
          expected: "Array<Array<string>>",
          value: input.isNotMemberOf
        },
        _errorFactory
      ));
  const _ao5 = (
    input: any,
    _path: string,
    _exceptionable: boolean = true
  ): boolean =>
    ("string" === typeof input.entry ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".entry",
          expected: "string",
          value: input.entry
        },
        _errorFactory
      )) &&
    ("inRange" === input.type ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".type",
          expected: '"inRange"',
          value: input.type
        },
        _errorFactory
      )) &&
    (((("object" === typeof input.inRange && null !== input.inRange) ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".inRange",
          expected: "RangePersistent",
          value: input.inRange
        },
        _errorFactory
      )) &&
      _ao6(input.inRange, _path + ".inRange", true && _exceptionable)) ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".inRange",
          expected: "RangePersistent",
          value: input.inRange
        },
        _errorFactory
      ));
  const _ao6 = (
    input: any,
    _path: string,
    _exceptionable: boolean = true
  ): boolean =>
    ("string" === typeof input.min ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".min",
          expected: "string",
          value: input.min
        },
        _errorFactory
      )) &&
    ("string" === typeof input.max ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".max",
          expected: "string",
          value: input.max
        },
        _errorFactory
      ));
  const _ao7 = (
    input: any,
    _path: string,
    _exceptionable: boolean = true
  ): boolean =>
    ("string" === typeof input.entry ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".entry",
          expected: "string",
          value: input.entry
        },
        _errorFactory
      )) &&
    ("notInRange" === input.type ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".type",
          expected: '"notInRange"',
          value: input.type
        },
        _errorFactory
      )) &&
    (((("object" === typeof input.notInRange && null !== input.notInRange) ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".notInRange",
          expected: "RangePersistent",
          value: input.notInRange
        },
        _errorFactory
      )) &&
      _ao6(input.notInRange, _path + ".notInRange", true && _exceptionable)) ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".notInRange",
          expected: "RangePersistent",
          value: input.notInRange
        },
        _errorFactory
      ));
  const _ao8 = (
    input: any,
    _path: string,
    _exceptionable: boolean = true
  ): boolean =>
    ("string" === typeof input.entry ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".entry",
          expected: "string",
          value: input.entry
        },
        _errorFactory
      )) &&
    ("equalsEntry" === input.type ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".type",
          expected: '"equalsEntry"',
          value: input.type
        },
        _errorFactory
      )) &&
    ("string" === typeof input.otherEntry ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".otherEntry",
          expected: "string",
          value: input.otherEntry
        },
        _errorFactory
      ));
  const _ao9 = (
    input: any,
    _path: string,
    _exceptionable: boolean = true
  ): boolean =>
    ("string" === typeof input.entry ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".entry",
          expected: "string",
          value: input.entry
        },
        _errorFactory
      )) &&
    ("notEqualsEntry" === input.type ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".type",
          expected: '"notEqualsEntry"',
          value: input.type
        },
        _errorFactory
      )) &&
    ("string" === typeof input.otherEntry ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".otherEntry",
          expected: "string",
          value: input.otherEntry
        },
        _errorFactory
      ));
  const _ao10 = (
    input: any,
    _path: string,
    _exceptionable: boolean = true
  ): boolean =>
    ("string" === typeof input.entry ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".entry",
          expected: "string",
          value: input.entry
        },
        _errorFactory
      )) &&
    ("greaterThan" === input.type ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".type",
          expected: '"greaterThan"',
          value: input.type
        },
        _errorFactory
      )) &&
    ("string" === typeof input.otherEntry ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".otherEntry",
          expected: "string",
          value: input.otherEntry
        },
        _errorFactory
      ));
  const _ao11 = (
    input: any,
    _path: string,
    _exceptionable: boolean = true
  ): boolean =>
    ("string" === typeof input.entry ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".entry",
          expected: "string",
          value: input.entry
        },
        _errorFactory
      )) &&
    ("greaterThanEq" === input.type ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".type",
          expected: '"greaterThanEq"',
          value: input.type
        },
        _errorFactory
      )) &&
    ("string" === typeof input.otherEntry ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".otherEntry",
          expected: "string",
          value: input.otherEntry
        },
        _errorFactory
      ));
  const _ao12 = (
    input: any,
    _path: string,
    _exceptionable: boolean = true
  ): boolean =>
    ("string" === typeof input.entry ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".entry",
          expected: "string",
          value: input.entry
        },
        _errorFactory
      )) &&
    ("lessThan" === input.type ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".type",
          expected: '"lessThan"',
          value: input.type
        },
        _errorFactory
      )) &&
    ("string" === typeof input.otherEntry ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".otherEntry",
          expected: "string",
          value: input.otherEntry
        },
        _errorFactory
      ));
  const _ao13 = (
    input: any,
    _path: string,
    _exceptionable: boolean = true
  ): boolean =>
    ("string" === typeof input.entry ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".entry",
          expected: "string",
          value: input.entry
        },
        _errorFactory
      )) &&
    ("lessThanEq" === input.type ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".type",
          expected: '"lessThanEq"',
          value: input.type
        },
        _errorFactory
      )) &&
    ("string" === typeof input.otherEntry ||
      __typia_transform__assertGuard._assertGuard(
        _exceptionable,
        {
          method: "typia.createAssert",
          path: _path + ".otherEntry",
          expected: "string",
          value: input.otherEntry
        },
        _errorFactory
      ));
  const _au0 = (
    input: any,
    _path: string,
    _exceptionable: boolean = true
  ): any =>
    (() => {
      if ("isMemberOf" === input.type)
        return _ao3(input, _path, true && _exceptionable);
      else if ("isNotMemberOf" === input.type)
        return _ao4(input, _path, true && _exceptionable);
      else if ("inRange" === input.type)
        return _ao5(input, _path, true && _exceptionable);
      else if ("notInRange" === input.type)
        return _ao7(input, _path, true && _exceptionable);
      else if ("lessThanEq" === input.type)
        return _ao13(input, _path, true && _exceptionable);
      else if ("lessThan" === input.type)
        return _ao12(input, _path, true && _exceptionable);
      else if ("greaterThanEq" === input.type)
        return _ao11(input, _path, true && _exceptionable);
      else if ("greaterThan" === input.type)
        return _ao10(input, _path, true && _exceptionable);
      else if ("notEqualsEntry" === input.type)
        return _ao9(input, _path, true && _exceptionable);
      else if ("equalsEntry" === input.type)
        return _ao8(input, _path, true && _exceptionable);
      else
        return __typia_transform__assertGuard._assertGuard(
          _exceptionable,
          {
            method: "typia.createAssert",
            path: _path,
            expected:
              "(IsMemberOf<any, Array<string>> | IsNotMemberOf<any, Array<string>> | InRange<any, string> | NotInRange<any, string> | LessThanEq<any, string, string> | LessThan<any, string, string> | GreaterThanEq<any, string, string> | GreaterThan<any, string, string> | NotEqualsEntry<any, string, string> | EqualsEntry<any, string, string>)",
            value: input
          },
          _errorFactory
        );
    })();
  const __is = (input: any): input is PODSpec<EntryTypes, StatementMap> =>
    "object" === typeof input && null !== input && _io0(input);
  let _errorFactory: any;
  return (
    input: any,
    errorFactory?: (p: import("typia").TypeGuardError.IProps) => Error
  ): PODSpec<EntryTypes, StatementMap> => {
    if (false === __is(input)) {
      _errorFactory = errorFactory;
      ((input: any, _path: string, _exceptionable: boolean = true) =>
        ((("object" === typeof input && null !== input) ||
          __typia_transform__assertGuard._assertGuard(
            true,
            {
              method: "typia.createAssert",
              path: _path + "",
              expected: "PODSpec<EntryTypes, StatementMap>",
              value: input
            },
            _errorFactory
          )) &&
          _ao0(input, _path + "", true)) ||
        __typia_transform__assertGuard._assertGuard(
          true,
          {
            method: "typia.createAssert",
            path: _path + "",
            expected: "PODSpec<EntryTypes, StatementMap>",
            value: input
          },
          _errorFactory
        ))(input, "$input", true);
    }
    return input;
  };
})();
