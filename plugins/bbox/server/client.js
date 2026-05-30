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
exports.defaultSpec = defaultSpec;
exports.resolveSpec = resolveSpec;
exports.bboxCall = bboxCall;
var config_ts_1 = require("../../../server/config.ts");
var http_client_ts_1 = require("../../../server/http-client.ts");
var session_ts_1 = require("../../../server/session.ts");
function defaultSpec() {
    return {
        name: "default",
        password: config_ts_1.BBOX_PASSWORD,
        host: config_ts_1.BBOX_HOST,
        connectHost: config_ts_1.BBOX_CONNECT_HOST,
        targetUrl: config_ts_1.targetUrl,
        isHttps: config_ts_1.isHttps,
    };
}
function resolveSpec(routerId) {
    var _a;
    return (_a = (0, config_ts_1.loadBboxRouterByName)(routerId)) !== null && _a !== void 0 ? _a : (routerId === "default" ? defaultSpec() : null);
}
function bboxCall(spec, method, bboxPath, body) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, bboxCallInternal(spec, method, bboxPath, body, false)];
        });
    });
}
function bboxCallInternal(spec, method, bboxPath, body, retry) {
    return __awaiter(this, void 0, void 0, function () {
        var sess, headers, cookieParts, reqPath, sep, bodyBuffer, form, captured, _a, statusCode, responseBody, currentSession, data;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, (0, session_ts_1.ensureSession)(spec)];
                case 1:
                    sess = _d.sent();
                    headers = { host: spec.host };
                    if (sess) {
                        cookieParts = ["BBOX_ID=".concat(sess.bboxId)];
                        if (sess.btoken)
                            cookieParts.push("btoken=".concat(sess.btoken));
                        headers["cookie"] = cookieParts.join("; ");
                    }
                    reqPath = bboxPath;
                    if (["POST", "PUT", "DELETE"].includes(method) && (sess === null || sess === void 0 ? void 0 : sess.btoken)) {
                        sep = reqPath.includes("?") ? "&" : "?";
                        reqPath += "".concat(sep, "btoken=").concat(encodeURIComponent(sess.btoken));
                    }
                    bodyBuffer = Buffer.alloc(0);
                    if (body !== undefined) {
                        form = new URLSearchParams(Object.entries(body).map(function (_a) {
                            var k = _a[0], v = _a[1];
                            return [k, String(v)];
                        })).toString();
                        bodyBuffer = Buffer.from(form);
                        headers["content-type"] = "application/x-www-form-urlencoded";
                        headers["content-length"] = bodyBuffer.length;
                    }
                    if (config_ts_1.VERBOSE)
                        console.log("[bbox:".concat(spec.name, "] ").concat(method, " ").concat(reqPath));
                    captured = { bboxId: (_b = sess === null || sess === void 0 ? void 0 : sess.bboxId) !== null && _b !== void 0 ? _b : "", btoken: (_c = sess === null || sess === void 0 ? void 0 : sess.btoken) !== null && _c !== void 0 ? _c : "" };
                    return [4 /*yield*/, (0, http_client_ts_1.makeRequestAsync)({
                            hostname: spec.connectHost,
                            port: spec.targetUrl.port ? Number(spec.targetUrl.port) : spec.isHttps ? 443 : 80,
                            path: reqPath,
                            method: method,
                            headers: headers,
                            protocol: spec.targetUrl.protocol,
                            rejectUnauthorized: false,
                            servername: spec.host,
                        }, bodyBuffer, captured)];
                case 2:
                    _a = _d.sent(), statusCode = _a.statusCode, responseBody = _a.body;
                    currentSession = (0, session_ts_1.getSession)(spec.name);
                    if (captured.bboxId && currentSession)
                        currentSession.bboxId = captured.bboxId;
                    if (captured.btoken && currentSession)
                        currentSession.btoken = captured.btoken;
                    if (!((statusCode === 401 || statusCode === 403) && !retry)) return [3 /*break*/, 4];
                    console.log("[bbox:".concat(spec.name, "] Token expir\u00E9, re-authentification\u2026"));
                    (0, session_ts_1.clearSession)(spec.name);
                    return [4 /*yield*/, (0, session_ts_1.ensureSession)(spec)];
                case 3:
                    _d.sent();
                    return [2 /*return*/, bboxCallInternal(spec, method, bboxPath, body, true)];
                case 4:
                    data = null;
                    if (responseBody.length > 0) {
                        try {
                            data = JSON.parse(responseBody.toString());
                        }
                        catch (_e) {
                            /* empty or non-JSON body */
                        }
                    }
                    return [2 /*return*/, { statusCode: statusCode, data: data }];
            }
        });
    });
}
