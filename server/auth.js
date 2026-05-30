"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveUsers = saveUsers;
exports.isAuthEnabled = isAuthEnabled;
exports.hashPassword = hashPassword;
exports.addOrUpdateUser = addOrUpdateUser;
exports.login = login;
exports.getSession = getSession;
exports.deleteSession = deleteSession;
exports.parseSessionCookie = parseSessionCookie;
var node_fs_1 = require("node:fs");
var node_crypto_1 = require("node:crypto");
var yaml_1 = require("yaml");
var config_ts_1 = require("./config.ts");
var SESSION_TTL_MS = 24 * 60 * 60 * 1000;
function loadSessions() {
    try {
        var entries = JSON.parse(node_fs_1.default.readFileSync(config_ts_1.SESSIONS_FILE, "utf8"));
        var now_1 = Date.now();
        return new Map(entries.filter(function (_a) {
            var s = _a[1];
            return s.expiresAt > now_1;
        }));
    }
    catch (_a) {
        return new Map();
    }
}
function saveSessions(map) {
    try {
        node_fs_1.default.writeFileSync(config_ts_1.SESSIONS_FILE, JSON.stringify(__spreadArray([], map, true)) + "\n");
    }
    catch ( /* non-fatal */_a) { /* non-fatal */ }
}
var sessions = loadSessions();
function loadConfig() {
    var _a;
    try {
        return (_a = (0, yaml_1.parse)(node_fs_1.default.readFileSync(config_ts_1.CONFIG_FILE, "utf8"))) !== null && _a !== void 0 ? _a : {};
    }
    catch (_b) {
        return {};
    }
}
function loadUsers() {
    var _a;
    var data = loadConfig();
    return (_a = data.users) !== null && _a !== void 0 ? _a : [];
}
function saveUsers(users) {
    var data = loadConfig();
    data.users = users;
    node_fs_1.default.writeFileSync(config_ts_1.CONFIG_FILE, (0, yaml_1.stringify)(data));
}
function isAuthEnabled() {
    return loadUsers().length > 0;
}
function hashPassword(password) {
    return __awaiter(this, void 0, void 0, function () {
        var salt, hash;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    salt = node_crypto_1.default.randomBytes(16).toString("hex");
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            return node_crypto_1.default.scrypt(password, salt, 64, function (err, key) { return (err ? reject(err) : resolve(key)); });
                        })];
                case 1:
                    hash = _a.sent();
                    return [2 /*return*/, "scrypt:".concat(salt, ":").concat(hash.toString("hex"))];
            }
        });
    });
}
function verifyPassword(password, stored) {
    return __awaiter(this, void 0, void 0, function () {
        var parts, salt, expected, hash, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    parts = stored.split(":");
                    if (parts.length !== 3 || parts[0] !== "scrypt")
                        return [2 /*return*/, false];
                    salt = parts[1], expected = parts[2];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            return node_crypto_1.default.scrypt(password, salt, 64, function (err, key) { return (err ? reject(err) : resolve(key)); });
                        })];
                case 2:
                    hash = _b.sent();
                    return [2 /*return*/, node_crypto_1.default.timingSafeEqual(hash, Buffer.from(expected, "hex"))];
                case 3:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function addOrUpdateUser(username, password) {
    return __awaiter(this, void 0, void 0, function () {
        var users, hash, idx;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    users = loadUsers();
                    return [4 /*yield*/, hashPassword(password)];
                case 1:
                    hash = _a.sent();
                    idx = users.findIndex(function (u) { return u.username === username; });
                    if (idx >= 0) {
                        users[idx].passwordHash = hash;
                    }
                    else {
                        users.push({ username: username, passwordHash: hash });
                    }
                    saveUsers(users);
                    return [2 /*return*/];
            }
        });
    });
}
function login(username, password) {
    return __awaiter(this, void 0, void 0, function () {
        var users, user, ok, token;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    users = loadUsers();
                    user = users.find(function (u) { return u.username === username; });
                    if (!user)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, verifyPassword(password, user.passwordHash)];
                case 1:
                    ok = _a.sent();
                    if (!ok)
                        return [2 /*return*/, null];
                    token = node_crypto_1.default.randomBytes(32).toString("hex");
                    sessions.set(token, { username: username, expiresAt: Date.now() + SESSION_TTL_MS });
                    saveSessions(sessions);
                    return [2 /*return*/, token];
            }
        });
    });
}
function getSession(token) {
    var session = sessions.get(token);
    if (!session)
        return null;
    if (Date.now() > session.expiresAt) {
        sessions.delete(token);
        saveSessions(sessions);
        return null;
    }
    return session;
}
function deleteSession(token) {
    sessions.delete(token);
    saveSessions(sessions);
}
function parseSessionCookie(cookieHeader) {
    if (!cookieHeader)
        return null;
    for (var _i = 0, _a = cookieHeader.split(";"); _i < _a.length; _i++) {
        var part = _a[_i];
        var eq = part.indexOf("=");
        if (eq === -1)
            continue;
        var k = part.slice(0, eq).trim();
        var v = part.slice(eq + 1).trim();
        if (k === "session" && v)
            return v;
    }
    return null;
}
