"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkConditionalScopes = exports.satisfiesConditionalScopes = exports.satisfiesScopes = exports.conditionalQueryMap = void 0;

var _regenerator = _interopRequireDefault(
  require("@babel/runtime/regenerator")
);

var _toConsumableArray2 = _interopRequireDefault(
  require("@babel/runtime/helpers/toConsumableArray")
);

var _asyncToGenerator2 = _interopRequireDefault(
  require("@babel/runtime/helpers/asyncToGenerator")
);

var _apolloServer = require("apollo-server");

// dictionary with indicator of condition and function to retrieve conditional query based on userId and crudObjectId
var conditionalQueryMap = new Map(); // initialize as empty map -> editable by end user

exports.conditionalQueryMap = conditionalQueryMap;

var satisfiesScopes = /*#__PURE__*/ (function() {
  var _ref = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/ _regenerator["default"].mark(function _callee(
      driver,
      scopes,
      userScopes,
      user,
      objectId
    ) {
      var ListOfScopesToVerify,
        scopesToVerifyDuplicates,
        scopesToVerify,
        nonConditionalScopes,
        conditionalScopes;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch ((_context.prev = _context.next)) {
            case 0:
              if (!Array.isArray(scopes)) scopes = [scopes];
              if (!Array.isArray(userScopes)) userScopes = [userScopes]; // Get all scopes that might be verified as these are found in the user Scopes.
              // This corresponds to all exact scope matches, as well as all conditional scope matches, e.g.
              // if the scope required is 'item:edit', then scopes to verify are both 'item:edit' as well as
              // 'item:edit:somecondition'. If the scope 'item:edit:somecondition' is required, then only this conditional scope
              // is matched on.

              ListOfScopesToVerify = scopes.map(function(scope) {
                return userScopes.filter(function(userScope) {
                  return userScope.indexOf(scope) === 0;
                });
              });
              scopesToVerifyDuplicates = [].concat.apply(
                [],
                ListOfScopesToVerify
              );
              scopesToVerify = (0, _toConsumableArray2["default"])(
                new Set(scopesToVerifyDuplicates)
              ); // remove duplicates
              // extract conditional and non conditional scopes

              nonConditionalScopes = scopesToVerify.filter(function(scope) {
                return scope.split(":").length === 2;
              });
              conditionalScopes = scopesToVerify.filter(function(scope) {
                return scope.split(":").length === 3;
              }); // check non conditional scopes (easiest to verify)

              if (!(nonConditionalScopes.length > 0)) {
                _context.next = 9;
                break;
              }

              return _context.abrupt("return", true);

            case 9:
              if (!(conditionalScopes.length > 0)) {
                _context.next = 15;
                break;
              }

              _context.next = 12;
              return checkConditionalScopes(
                driver,
                conditionalScopes,
                user,
                objectId
              );

            case 12:
              return _context.abrupt("return", _context.sent);

            case 15:
              return _context.abrupt("return", false);

            case 16:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    })
  );

  return function satisfiesScopes(_x, _x2, _x3, _x4, _x5) {
    return _ref.apply(this, arguments);
  };
})();

exports.satisfiesScopes = satisfiesScopes;

var satisfiesConditionalScopes = /*#__PURE__*/ (function() {
  var _ref2 = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/ _regenerator["default"].mark(function _callee2(
      driver,
      scopes,
      userScopes,
      user,
      objectId
    ) {
      var no_intersection_result,
        conditionalScopes,
        _args2 = arguments;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch ((_context2.prev = _context2.next)) {
            case 0:
              no_intersection_result =
                _args2.length > 5 && _args2[5] !== undefined
                  ? _args2[5]
                  : false;
              // set conditions to be an array
              if (!Array.isArray(scopes)) scopes = [scopes];
              if (!Array.isArray(userScopes)) userScopes = [userScopes]; // intersection of requiredScopes and userScopes

              conditionalScopes = scopes.filter(function(scope) {
                return userScopes.includes(scope);
              });

              if (!(conditionalScopes.length === 0)) {
                _context2.next = 6;
                break;
              }

              return _context2.abrupt("return", no_intersection_result);

            case 6:
              if (!driver) {
                _context2.next = 12;
                break;
              }

              _context2.next = 9;
              return checkConditionalScopes(
                driver,
                conditionalScopes,
                user,
                objectId
              );

            case 9:
              return _context2.abrupt("return", _context2.sent);

            case 12:
              return _context2.abrupt("return", false);

            case 13:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    })
  );

  return function satisfiesConditionalScopes(_x6, _x7, _x8, _x9, _x10) {
    return _ref2.apply(this, arguments);
  };
})();

exports.satisfiesConditionalScopes = satisfiesConditionalScopes;

var checkConditionalScopes = /*#__PURE__*/ (function() {
  var _ref3 = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/ _regenerator["default"].mark(function _callee3(
      driver,
      scopes,
      user,
      objectId
    ) {
      var crudObjects, crudObject, conditions, query, result;
      return _regenerator["default"].wrap(
        function _callee3$(_context3) {
          while (1) {
            switch ((_context3.prev = _context3.next)) {
              case 0:
                if (!(driver == null)) {
                  _context3.next = 2;
                  break;
                }

                throw new Error(
                  "No driver to the database is provided, therefore conditional scopes cannot be verified."
                );

              case 2:
                // set conditions to be an array
                if (!Array.isArray(scopes)) scopes = [scopes];
                crudObjects = scopes.map(function(scope) {
                  var brokenUp = scope.split(":");
                  return brokenUp[0].trim();
                });

                if (
                  crudObjects.every(function(val, i, arr) {
                    return val === arr[0];
                  })
                ) {
                  _context3.next = 6;
                  break;
                }

                throw new _apolloServer.UserInputError(
                  "All crud objects must be the same"
                );

              case 6:
                crudObject = crudObjects[0];
                conditions = scopes.map(function(scope) {
                  var brokenUp = scope.split(":");
                  return (
                    crudObject + ":" + brokenUp[brokenUp.length - 1].trim()
                  );
                });
                query = "WITH false AS result";
                conditions.forEach(function(condition) {
                  // Todo: first check the existence of the condition in the conditionalQueryMap
                  var conditionalQuery = conditionalQueryMap.get(condition);

                  if (conditionalQuery) {
                    query = ""
                      .concat(query, "\n            ")
                      .concat(
                        conditionalQuery(user, objectId),
                        ", result\n            WITH result OR is_allowed as result"
                      ); // if we find a single occurrence of true, then result is true
                  }
                });
                query = "".concat(query, "\n    RETURN result as result");
                _context3.prev = 11;
                _context3.next = 14;
                return driver.session().run(query);

              case 14:
                result = _context3.sent;
                return _context3.abrupt(
                  "return",
                  result.records[0].get("result")
                );

              case 18:
                _context3.prev = 18;
                _context3.t0 = _context3["catch"](11);
                return _context3.abrupt("return", false);

              case 21:
              case "end":
                return _context3.stop();
            }
          }
        },
        _callee3,
        null,
        [[11, 18]]
      );
    })
  );

  return function checkConditionalScopes(_x11, _x12, _x13, _x14) {
    return _ref3.apply(this, arguments);
  };
})();

exports.checkConditionalScopes = checkConditionalScopes;
