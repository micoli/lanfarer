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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSession = getSession;
exports.clearSession = clearSession;
exports.ensureSession = ensureSession;
var node_crypto_1 = require("node:crypto");
var config_ts_1 = require("./config.ts");
var http_client_ts_1 = require("./http-client.ts");
var sessions = new Map();
var loginsInProgress = new Map();
// Legacy single-router accessors used by proxy for the default router
function getSession(routerId) {
    var _a;
    if (routerId === void 0) { routerId = "default"; }
    return (_a = sessions.get(routerId)) !== null && _a !== void 0 ? _a : null;
}
function clearSession(routerId) {
    if (routerId === void 0) { routerId = "default"; }
    sessions.delete(routerId);
}
function sha1hex(s) {
    return node_crypto_1.default.createHash("sha1").update(s).digest("hex");
}
function defaultSpec() {
    return { name: "default", password: config_ts_1.BBOX_PASSWORD, host: config_ts_1.BBOX_HOST, connectHost: config_ts_1.BBOX_CONNECT_HOST, targetUrl: config_ts_1.targetUrl, isHttps: config_ts_1.isHttps };
}
function tryLogin(password, captured, spec) {
    return __awaiter(this, void 0, void 0, function () {
        var body, loginHeaders, _a, statusCode, loginResponseHeaders, responseBody, text, json, bt;
        var _b, _c, _d, _e, _f, _g, _h, _j;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    body = Buffer.from(new URLSearchParams({ password: password }).toString());
                    loginHeaders = {
                        host: spec.host,
                        "content-type": "application/x-www-form-urlencoded",
                        "content-length": body.length,
                        "user-agent": "Mozilla/5.0",
                        "x-requested-with": "XmlHttpRequest",
                        origin: "https://".concat(spec.host),
                        referer: "https://".concat(spec.host, "/login.html"),
                    };
                    return [4 /*yield*/, (0, http_client_ts_1.makeRequestAsync)({
                            hostname: spec.connectHost,
                            port: spec.targetUrl.port ? Number(spec.targetUrl.port) : spec.isHttps ? 443 : 80,
                            path: "/api/v1/login",
                            method: "POST",
                            headers: loginHeaders,
                            protocol: spec.targetUrl.protocol,
                            rejectUnauthorized: false,
                            servername: spec.host,
                        }, body, captured)];
                case 1:
                    _a = _k.sent(), statusCode = _a.statusCode, loginResponseHeaders = _a.headers, responseBody = _a.body;
                    console.log("[session:".concat(spec.name, "] login status=").concat(statusCode, " set-cookie:"), (_b = loginResponseHeaders["set-cookie"]) !== null && _b !== void 0 ? _b : "(none)");
                    console.log("[session:".concat(spec.name, "] login body: ").concat(responseBody.toString().slice(0, 500)));
                    if (!captured.btoken && responseBody.length) {
                        try {
                            text = responseBody.toString();
                            json = JSON.parse(text);
                            bt = (_g = (_e = (_c = json === null || json === void 0 ? void 0 : json.btoken) !== null && _c !== void 0 ? _c : (_d = json === null || json === void 0 ? void 0 : json[0]) === null || _d === void 0 ? void 0 : _d.btoken) !== null && _e !== void 0 ? _e : (_f = json === null || json === void 0 ? void 0 : json.login) === null || _f === void 0 ? void 0 : _f.btoken) !== null && _g !== void 0 ? _g : (_j = (_h = json === null || json === void 0 ? void 0 : json[0]) === null || _h === void 0 ? void 0 : _h.login) === null || _j === void 0 ? void 0 : _j.btoken;
                            if (bt)
                                captured.btoken = bt;
                        }
                        catch ( /* not JSON */_l) { /* not JSON */ }
                    }
                    return [2 /*return*/, statusCode];
            }
        });
    });
}
function fetchBToken(bboxId, spec) {
    return __awaiter(this, void 0, void 0, function () {
        var captured, _a, statusCode, body, json, token;
        var _b, _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    captured = { bboxId: bboxId, btoken: "" };
                    return [4 /*yield*/, (0, http_client_ts_1.makeRequestAsync)({
                            hostname: spec.connectHost,
                            port: spec.targetUrl.port ? Number(spec.targetUrl.port) : spec.isHttps ? 443 : 80,
                            path: "/api/v1/device/token",
                            method: "GET",
                            headers: {
                                host: spec.host,
                                "user-agent": "Mozilla/5.0",
                                accept: "application/json",
                                cookie: "BBOX_ID=".concat(bboxId),
                            },
                            protocol: spec.targetUrl.protocol,
                            rejectUnauthorized: false,
                            servername: spec.host,
                        }, Buffer.alloc(0), captured)];
                case 1:
                    _a = _h.sent(), statusCode = _a.statusCode, body = _a.body;
                    try {
                        json = JSON.parse(body.toString());
                        token = ((_g = (_f = (_d = (_c = (_b = json === null || json === void 0 ? void 0 : json[0]) === null || _b === void 0 ? void 0 : _b.device) === null || _c === void 0 ? void 0 : _c.token) !== null && _d !== void 0 ? _d : (_e = json === null || json === void 0 ? void 0 : json.device) === null || _e === void 0 ? void 0 : _e.token) !== null && _f !== void 0 ? _f : json === null || json === void 0 ? void 0 : json.token) !== null && _g !== void 0 ? _g : "");
                        console.log("[session:".concat(spec.name, "] GET /api/v1/device/token \u2192 ").concat(statusCode, " token: ").concat(token ? token.slice(0, 12) + "…" : "(vide)"));
                        return [2 /*return*/, token];
                    }
                    catch (_j) {
                        console.log("[session:".concat(spec.name, "] GET /api/v1/device/token \u2192 ").concat(statusCode, " body: ").concat(body.toString().slice(0, 200)));
                        return [2 /*return*/, ""];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function doLogin(spec) {
    return __awaiter(this, void 0, void 0, function () {
        var captured, status, btoken, s;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!spec.password)
                        return [2 /*return*/];
                    captured = { bboxId: "", btoken: "" };
                    return [4 /*yield*/, tryLogin(spec.password, captured, spec)];
                case 1:
                    status = _a.sent();
                    if (!(status === 401)) return [3 /*break*/, 3];
                    return [4 /*yield*/, tryLogin(sha1hex(spec.password), captured, spec)];
                case 2:
                    status = _a.sent();
                    _a.label = 3;
                case 3:
                    if (status === 401 || !captured.bboxId) {
                        console.error("[session:".concat(spec.name, "] Authentification Bbox \u00E9chou\u00E9e \u2014 v\u00E9rifiez le mot de passe dans config.yaml"));
                        sessions.set(spec.name, null);
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, fetchBToken(captured.bboxId, spec)];
                case 4:
                    btoken = _a.sent();
                    s = { bboxId: captured.bboxId, btoken: btoken };
                    sessions.set(spec.name, s);
                    console.log("[session:".concat(spec.name, "] Session \u00E9tablie \u2014 bboxId: ").concat(s.bboxId.slice(0, 12), "\u2026 btoken: ").concat(s.btoken.slice(0, 20), "\u2026"));
                    return [2 /*return*/];
            }
        });
    });
}
function ensureSession(spec) {
    return __awaiter(this, void 0, void 0, function () {
        var resolved, key, existing, inProgress, promise;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    resolved = spec !== null && spec !== void 0 ? spec : defaultSpec();
                    key = resolved.name;
                    existing = sessions.get(key);
                    if (existing !== undefined)
                        return [2 /*return*/, existing];
                    inProgress = loginsInProgress.get(key);
                    if (!inProgress) return [3 /*break*/, 2];
                    return [4 /*yield*/, inProgress];
                case 1:
                    _c.sent();
                    return [2 /*return*/, (_a = sessions.get(key)) !== null && _a !== void 0 ? _a : null];
                case 2:
                    promise = doLogin(resolved).finally(function () { loginsInProgress.delete(key); });
                    loginsInProgress.set(key, promise);
                    return [4 /*yield*/, promise];
                case 3:
                    _c.sent();
                    return [2 /*return*/, (_b = sessions.get(key)) !== null && _b !== void 0 ? _b : null];
            }
        });
    });
}
