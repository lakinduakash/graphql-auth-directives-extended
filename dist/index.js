"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "satisfiesConditionalScopes", {
  enumerable: true,
  get: function get() {
    return _permissions.satisfiesConditionalScopes;
  }
});
Object.defineProperty(exports, "conditionalQueryMap", {
  enumerable: true,
  get: function get() {
    return _permissions.conditionalQueryMap;
  }
});
exports.IsAuthenticatedDirective = exports.HasRoleDirective = exports.HasScopeDirective = exports.verifyAndDecodeToken = exports.loadPermissionSchema = exports.defaultRole = void 0;

var _regenerator = _interopRequireDefault(
  require("@babel/runtime/regenerator")
);

var _defineProperty2 = _interopRequireDefault(
  require("@babel/runtime/helpers/defineProperty")
);

var _asyncToGenerator2 = _interopRequireDefault(
  require("@babel/runtime/helpers/asyncToGenerator")
);

var _classCallCheck2 = _interopRequireDefault(
  require("@babel/runtime/helpers/classCallCheck")
);

var _createClass2 = _interopRequireDefault(
  require("@babel/runtime/helpers/createClass")
);

var _inherits2 = _interopRequireDefault(
  require("@babel/runtime/helpers/inherits")
);

var _possibleConstructorReturn2 = _interopRequireDefault(
  require("@babel/runtime/helpers/possibleConstructorReturn")
);

var _getPrototypeOf2 = _interopRequireDefault(
  require("@babel/runtime/helpers/getPrototypeOf")
);

var _errors = require("./errors");

var _http = require("http");

var jwt = _interopRequireWildcard(require("jsonwebtoken"));

var _graphqlTools = require("graphql-tools");

var _graphql = require("graphql");

var _permissions = require("./permissions");

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly)
      symbols = symbols.filter(function(sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
    keys.push.apply(keys, symbols);
  }
  return keys;
}

function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    if (i % 2) {
      ownKeys(Object(source), true).forEach(function(key) {
        (0, _defineProperty2["default"])(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function(key) {
        Object.defineProperty(
          target,
          key,
          Object.getOwnPropertyDescriptor(source, key)
        );
      });
    }
  }
  return target;
}

function _createSuper(Derived) {
  var hasNativeReflectConstruct = _isNativeReflectConstruct();
  return function _createSuperInternal() {
    var Super = (0, _getPrototypeOf2["default"])(Derived),
      result;
    if (hasNativeReflectConstruct) {
      var NewTarget = (0, _getPrototypeOf2["default"])(this).constructor;
      result = Reflect.construct(Super, arguments, NewTarget);
    } else {
      result = Super.apply(this, arguments);
    }
    return (0, _possibleConstructorReturn2["default"])(this, result);
  };
}

function _isNativeReflectConstruct() {
  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
  if (Reflect.construct.sham) return false;
  if (typeof Proxy === "function") return true;
  try {
    Boolean.prototype.valueOf.call(
      Reflect.construct(Boolean, [], function() {})
    );
    return true;
  } catch (e) {
    return false;
  }
}

// export the defaultRole
var defaultRole = process.env.DEFAULT_ROLE
  ? process.env.DEFAULT_ROLE
  : "visitor"; // Get scopes from env

exports.defaultRole = defaultRole;
var allScopes = process.env.PERMISSIONS
  ? JSON.parse(Buffer.from(process.env.PERMISSIONS, "base64").toString("utf-8"))
  : null;
/**
 * Provide own permission schema. Override the environemnt.
 *
 * @param {*} schema schema object
 */

var loadPermissionSchema = function loadPermissionSchema(schema) {
  allScopes = schema;
};

exports.loadPermissionSchema = loadPermissionSchema;
var authorizationHeader = process.env.AUTHORIZATION_HEADER
  ? process.env.AUTHORIZATION_HEADER
  : "authorization";
var objectIdIdentifier = process.env.OBJECT_IDENTIFIER
  ? process.env.OBJECT_IDENTIFIER.split(",").map(function(s) {
      return s.trim();
    })
  : ["id", "uid"];

var userMetaMapper = function userMetaMapper(user, metas) {
  if (process.env.USER_METAS) {
    metas = process.env.USER_METAS.split(",");
  }

  if (user) {
    // e.g. roles
    // This can be made more generic for more custom meta data
    if (metas == null) {
      return user;
    }

    if (typeof metas === "string") {
      metas = [metas]; // Make an array
    }

    metas.forEach(function(meta) {
      var key = Object.keys(user).find(function(key) {
        return key.toLowerCase().endsWith("/".concat(meta));
      });

      if (key) {
        user[meta] = user[key];
        delete user[key];
      }
    });
    return user;
  }

  return null;
};

var getRolesAndScopes = function getRolesAndScopes(
  user,
  defaultRole,
  allScopes
) {
  // No user provided but scopes exists
  if (user == null) {
    if (allScopes) {
      return {
        roles: defaultRole,
        scopes: allScopes[defaultRole]
      };
    } else {
      return {
        roles: defaultRole,
        scopes: null
      };
    }
  } else {
    // case: user exists
    var roles =
      user.role || user.roles || user.Role || user.Roles || defaultRole;
    var userScopes = user.scope || user.scopes || user.Scope || user.scopes;

    if (userScopes) {
      // scopes are provided, take that as leading
      return {
        roles: null,
        scopes: userScopes
      };
    }

    if (allScopes == null) {
      // No scopes provided at all, thus return roles only
      if (roles) {
        return {
          roles: roles,
          scopes: null
        };
      } else {
        (0, _errors.AuthorizationError)({
          message: "No roles and scopes exists for the user."
        });
      }
    } else {
      // case: allScopes does exists
      if (roles) {
        // a single scope is provided
        if (typeof roles === "string") {
          return {
            roles: roles,
            scopes: allScopes[roles]
          };
        } // if multiple roles are provided the scopes are concatenated

        if (Array.isArray(roles)) {
          var scopesArray = roles.map(function(role) {
            return allScopes[role];
          });
          var allScopesForUser = [].concat.apply([], scopesArray); // concatenate scopes
          // Get the unique scopes

          allScopesForUser = allScopesForUser.filter(function(
            value,
            index,
            self
          ) {
            return self.indexOf(value) === index;
          });
          return {
            roles: roles,
            scopes: allScopesForUser
          };
        }
      } else {
        (0, _errors.AuthorizationError)({
          message: "No role could be attached to the user."
        });
      }
    }

    (0, _errors.AuthorizationError)({
      message: "No roles and scopes exists for the user."
    });
  }
};

var verifyAndDecodeToken = function verifyAndDecodeToken(_ref) {
  var context = _ref.context;
  var req =
    context instanceof _http.IncomingMessage
      ? context
      : context.req || context.request;

  if (
    !req ||
    !req.headers ||
    (!req.headers[authorizationHeader] && !req.headers[authorizationHeader]) ||
    (!req && !req.cookies && !req.cookies.token)
  ) {
    throw new _errors.AuthorizationError({
      message: "No authorization token."
    });
  }

  var token =
    req.headers[authorizationHeader] ||
    req.headers[authorizationHeader] ||
    req.cookies.token;

  try {
    var id_token = token.replace("Bearer ", "");
    var _process$env = process.env,
      JWT_SECRET = _process$env.JWT_SECRET,
      JWT_NO_VERIFY = _process$env.JWT_NO_VERIFY;
    var decoded = null;

    if (!JWT_SECRET && JWT_NO_VERIFY) {
      decoded = jwt.decode(id_token);
    } else {
      decoded = jwt.verify(id_token, JWT_SECRET, {
        algorithms: ["HS256", "RS256"]
      });
    }

    return userMetaMapper(decoded); // finally map url metas to metas
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new _errors.AuthorizationError({
        message: "Your token is expired"
      });
    } else {
      throw new _errors.AuthorizationError({
        message: "You are not authorized for this resource."
      });
    }
  }
};

exports.verifyAndDecodeToken = verifyAndDecodeToken;

var HasScopeDirective = /*#__PURE__*/ (function(_SchemaDirectiveVisit) {
  (0, _inherits2["default"])(HasScopeDirective, _SchemaDirectiveVisit);

  var _super = _createSuper(HasScopeDirective);

  function HasScopeDirective() {
    (0, _classCallCheck2["default"])(this, HasScopeDirective);
    return _super.apply(this, arguments);
  }

  (0, _createClass2["default"])(
    HasScopeDirective,
    [
      {
        key: "visitFieldDefinition",
        // used for example, with Query and Mutation fields
        value: function visitFieldDefinition(field) {
          var expectedScopes = this.args.scopes;
          var next = field.resolve; // wrap resolver with auth check

          field.resolve = /*#__PURE__*/ (function() {
            var _ref2 = (0, _asyncToGenerator2["default"])(
              /*#__PURE__*/ _regenerator["default"].mark(function _callee(
                result,
                args,
                context,
                info
              ) {
                var authenticationError, rolesAndScopes, existingIds, objectId;
                return _regenerator["default"].wrap(function _callee$(
                  _context
                ) {
                  while (1) {
                    switch ((_context.prev = _context.next)) {
                      case 0:
                        authenticationError = null;

                        try {
                          context.user = verifyAndDecodeToken({
                            context: context
                          });
                        } catch (e) {
                          authenticationError = e;
                        }

                        rolesAndScopes = getRolesAndScopes(
                          context.user,
                          defaultRole,
                          allScopes
                        );
                        context.user = _objectSpread(
                          _objectSpread({}, context.user),
                          rolesAndScopes
                        ); // create or extend

                        existingIds = objectIdIdentifier.filter(function(id) {
                          return args.hasOwnProperty(id);
                        });
                        objectId =
                          existingIds.length > 0 ? args[existingIds[0]] : null;
                        _context.t0 = context.user.scopes !== null;

                        if (!_context.t0) {
                          _context.next = 11;
                          break;
                        }

                        _context.next = 10;
                        return (0, _permissions.satisfiesScopes)(
                          context.driver,
                          expectedScopes,
                          context.user.scopes,
                          context.user,
                          objectId
                        );

                      case 10:
                        _context.t0 = _context.sent;

                      case 11:
                        if (!_context.t0) {
                          _context.next = 13;
                          break;
                        }

                        return _context.abrupt(
                          "return",
                          next(result, args, context, info)
                        );

                      case 13:
                        if (
                          !(
                            context.user.roles === defaultRole &&
                            authenticationError
                          )
                        ) {
                          _context.next = 15;
                          break;
                        }

                        throw authenticationError;

                      case 15:
                        throw new _errors.AuthorizationError({
                          message: "You are not authorized for this resource."
                        });

                      case 16:
                      case "end":
                        return _context.stop();
                    }
                  }
                },
                _callee);
              })
            );

            return function(_x, _x2, _x3, _x4) {
              return _ref2.apply(this, arguments);
            };
          })();
        }
      },
      {
        key: "visitObject",
        value: function visitObject(obj) {
          var fields = obj.getFields();
          var expectedScopes = this.args.scopes;
          Object.keys(fields).forEach(function(fieldName) {
            var field = fields[fieldName];
            var next = field.resolve;

            field.resolve = /*#__PURE__*/ (function() {
              var _ref3 = (0, _asyncToGenerator2["default"])(
                /*#__PURE__*/ _regenerator["default"].mark(function _callee2(
                  result,
                  args,
                  context,
                  info
                ) {
                  var authenticationError,
                    rolesAndScopes,
                    existingIds,
                    objectId;
                  return _regenerator["default"].wrap(function _callee2$(
                    _context2
                  ) {
                    while (1) {
                      switch ((_context2.prev = _context2.next)) {
                        case 0:
                          authenticationError = null;

                          try {
                            context.user = verifyAndDecodeToken({
                              context: context
                            });
                          } catch (e) {
                            authenticationError = e;
                          }

                          rolesAndScopes = getRolesAndScopes(
                            context.user,
                            defaultRole,
                            allScopes
                          );
                          context.user = _objectSpread(
                            _objectSpread({}, context.user),
                            rolesAndScopes
                          ); // create or extend

                          existingIds = objectIdIdentifier.filter(function(id) {
                            return args.hasOwnProperty(id);
                          });
                          objectId =
                            existingIds.length > 0
                              ? args[existingIds[0]]
                              : null;
                          _context2.t0 = context.user.scopes !== null;

                          if (!_context2.t0) {
                            _context2.next = 11;
                            break;
                          }

                          _context2.next = 10;
                          return (0, _permissions.satisfiesScopes)(
                            context.driver,
                            expectedScopes,
                            context.user.scopes,
                            context.user,
                            objectId // take the object id to be either id or uid, providing preference to id
                          );

                        case 10:
                          _context2.t0 = _context2.sent;

                        case 11:
                          if (!_context2.t0) {
                            _context2.next = 13;
                            break;
                          }

                          return _context2.abrupt(
                            "return",
                            next(result, args, context, info)
                          );

                        case 13:
                          if (
                            !(
                              context.user.roles === defaultRole &&
                              authenticationError
                            )
                          ) {
                            _context2.next = 15;
                            break;
                          }

                          throw authenticationError;

                        case 15:
                          throw new _errors.AuthorizationError({
                            message: "You are not authorized for this resource."
                          });

                        case 16:
                        case "end":
                          return _context2.stop();
                      }
                    }
                  },
                  _callee2);
                })
              );

              return function(_x5, _x6, _x7, _x8) {
                return _ref3.apply(this, arguments);
              };
            })();
          });
        }
      }
    ],
    [
      {
        key: "getDirectiveDeclaration",
        value: function getDirectiveDeclaration(directiveName, schema) {
          return new _graphql.GraphQLDirective({
            name: "hasScope",
            locations: [
              _graphql.DirectiveLocation.FIELD_DEFINITION,
              _graphql.DirectiveLocation.OBJECT
            ],
            args: {
              scopes: {
                type: new _graphql.GraphQLList(_graphql.GraphQLString),
                defaultValue: ["none:read"]
              }
            }
          });
        }
      }
    ]
  );
  return HasScopeDirective;
})(_graphqlTools.SchemaDirectiveVisitor);

exports.HasScopeDirective = HasScopeDirective;

var HasRoleDirective = /*#__PURE__*/ (function(_SchemaDirectiveVisit2) {
  (0, _inherits2["default"])(HasRoleDirective, _SchemaDirectiveVisit2);

  var _super2 = _createSuper(HasRoleDirective);

  function HasRoleDirective() {
    (0, _classCallCheck2["default"])(this, HasRoleDirective);
    return _super2.apply(this, arguments);
  }

  (0, _createClass2["default"])(
    HasRoleDirective,
    [
      {
        key: "visitFieldDefinition",
        value: function visitFieldDefinition(field) {
          var expectedRoles = this.args.roles;
          var next = field.resolve;

          field.resolve = function(result, args, context, info) {
            var authenticationError = null;

            try {
              context.user = verifyAndDecodeToken({
                context: context
              });
            } catch (e) {
              authenticationError = e;
            }

            var rolesAndScopes = getRolesAndScopes(
              context.user,
              defaultRole,
              allScopes
            );
            context.user = _objectSpread(
              _objectSpread({}, context.user),
              rolesAndScopes
            ); // create or extend

            if (
              expectedRoles.some(function(role) {
                return context.user.roles.indexOf(role) !== -1;
              })
            ) {
              return next(result, args, context, info);
            }

            if (context.user.roles === defaultRole && authenticationError) {
              throw authenticationError;
            }

            throw new _errors.AuthorizationError({
              message: "You are not authorized for this resource."
            });
          };
        }
      },
      {
        key: "visitObject",
        value: function visitObject(obj) {
          var fields = obj.getFields();
          var expectedRoles = this.args.roles;
          Object.keys(fields).forEach(function(fieldName) {
            var field = fields[fieldName];
            var next = field.resolve;

            field.resolve = function(result, args, context, info) {
              var authenticationError = null;

              try {
                context.user = verifyAndDecodeToken({
                  context: context
                });
              } catch (e) {
                authenticationError = e;
              }

              var rolesAndScopes = getRolesAndScopes(
                context.user,
                defaultRole,
                allScopes
              );
              context.user = _objectSpread(
                _objectSpread({}, context.user),
                rolesAndScopes
              ); // create or extend

              if (
                expectedRoles.some(function(role) {
                  return context.user.roles.indexOf(role) !== -1;
                })
              ) {
                return next(result, args, context, info);
              }

              if (context.user.roles === defaultRole && authenticationError) {
                throw authenticationError;
              }

              throw new _errors.AuthorizationError({
                message: "You are not authorized for this resource."
              });
            };
          });
        }
      }
    ],
    [
      {
        key: "getDirectiveDeclaration",
        value: function getDirectiveDeclaration(directiveName, schema) {
          return new _graphql.GraphQLDirective({
            name: "hasRole",
            locations: [
              _graphql.DirectiveLocation.FIELD_DEFINITION,
              _graphql.DirectiveLocation.OBJECT
            ],
            args: {
              roles: {
                type: new _graphql.GraphQLList(schema.getType("Role")),
                defaultValue: "reader"
              }
            }
          });
        }
      }
    ]
  );
  return HasRoleDirective;
})(_graphqlTools.SchemaDirectiveVisitor);

exports.HasRoleDirective = HasRoleDirective;

var IsAuthenticatedDirective = /*#__PURE__*/ (function(_SchemaDirectiveVisit3) {
  (0, _inherits2["default"])(IsAuthenticatedDirective, _SchemaDirectiveVisit3);

  var _super3 = _createSuper(IsAuthenticatedDirective);

  function IsAuthenticatedDirective() {
    (0, _classCallCheck2["default"])(this, IsAuthenticatedDirective);
    return _super3.apply(this, arguments);
  }

  (0, _createClass2["default"])(
    IsAuthenticatedDirective,
    [
      {
        key: "visitObject",
        value: function visitObject(obj) {
          var fields = obj.getFields();
          Object.keys(fields).forEach(function(fieldName) {
            var field = fields[fieldName];
            var next = field.resolve;

            field.resolve = function(result, args, context, info) {
              context.user = verifyAndDecodeToken({
                context: context
              });
              var rolesAndScopes = getRolesAndScopes(
                context.user,
                defaultRole,
                allScopes
              );
              context.user = _objectSpread(
                _objectSpread({}, context.user),
                rolesAndScopes
              ); // create or extend

              return next(result, args, context, info);
            };
          });
        }
      },
      {
        key: "visitFieldDefinition",
        value: function visitFieldDefinition(field) {
          var next = field.resolve;

          field.resolve = function(result, args, context, info) {
            context.user = verifyAndDecodeToken({
              context: context
            });
            var rolesAndScopes = getRolesAndScopes(
              context.user,
              defaultRole,
              allScopes
            );
            context.user = _objectSpread(
              _objectSpread({}, context.user),
              rolesAndScopes
            ); // create or extend

            return next(result, args, context, info);
          };
        }
      }
    ],
    [
      {
        key: "getDirectiveDeclaration",
        value: function getDirectiveDeclaration(directiveName, schema) {
          return new _graphql.GraphQLDirective({
            name: "isAuthenticated",
            locations: [
              _graphql.DirectiveLocation.FIELD_DEFINITION,
              _graphql.DirectiveLocation.OBJECT
            ]
          });
        }
      }
    ]
  );
  return IsAuthenticatedDirective;
})(_graphqlTools.SchemaDirectiveVisitor);

exports.IsAuthenticatedDirective = IsAuthenticatedDirective;
