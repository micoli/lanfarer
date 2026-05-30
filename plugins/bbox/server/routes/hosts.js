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
exports.fetchBboxHosts = fetchBboxHosts;
exports.handleHosts = handleHosts;
var client_ts_1 = require("../client.ts");
var utils_ts_1 = require("../utils.ts");
function extractHosts(data) {
    if (!Array.isArray(data) || data.length === 0)
        return [];
    var first = data[0];
    var h = first === null || first === void 0 ? void 0 : first.hosts;
    if (h && !Array.isArray(h) && Array.isArray(h.list)) {
        return h.list;
    }
    if (Array.isArray(h))
        return h;
    if (typeof first === "object")
        return data;
    return [];
}
function fetchBboxHosts(spec) {
    return __awaiter(this, void 0, void 0, function () {
        var result, rawHosts, hosts;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, client_ts_1.bboxCall)(spec, "GET", "/api/v1/hosts")];
                case 1:
                    result = _a.sent();
                    if (result.statusCode !== 200)
                        return [2 /*return*/, { hosts: [] }];
                    rawHosts = extractHosts(result.data);
                    hosts = rawHosts
                        .filter(function (h) { return h.macaddress; })
                        .map(function (h) {
                        var _a, _b;
                        return ({
                            mac: h.macaddress,
                            ip: (_a = h.ipaddress) !== null && _a !== void 0 ? _a : "",
                            ip6: h.ip6address || undefined,
                            hostname: (_b = h.hostname) !== null && _b !== void 0 ? _b : "",
                            active: h.active === 1,
                            type: h.type || undefined,
                            lastseen: h.lastseen,
                        });
                    });
                    return [2 /*return*/, { hosts: hosts }];
            }
        });
    });
}
function handleHosts(_req, res, spec) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchBboxHosts(spec)];
                case 1:
                    data = _a.sent();
                    if (data.hosts.length === 0) {
                        (0, utils_ts_1.sendError)(res, 502, "Failed to fetch hosts from bbox");
                        return [2 /*return*/];
                    }
                    (0, utils_ts_1.sendJson)(res, 200, data);
                    return [2 /*return*/];
            }
        });
    });
}
