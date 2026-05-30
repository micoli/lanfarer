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
exports.pingOnce = pingOnce;
exports.handlePing = handlePing;
var node_child_process_1 = require("node:child_process");
var node_util_1 = require("node:util");
var execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
var MAX_IPS = 20;
var INTERVAL_MS = 3000;
function pingOnce(ip) {
    return __awaiter(this, void 0, void 0, function () {
        var timeoutFlag, stdout, m, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    timeoutFlag = process.platform === "darwin" ? "-t" : "-W";
                    return [4 /*yield*/, execAsync("ping -c 1 ".concat(timeoutFlag, " 2 \"").concat(ip, "\""), { timeout: 4000 })];
                case 1:
                    stdout = (_b.sent()).stdout;
                    m = stdout.match(/time=([\d.]+)/);
                    if (m)
                        return [2 /*return*/, parseFloat(m[1])];
                    return [3 /*break*/, 3];
                case 2:
                    _a = _b.sent();
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/, null];
            }
        });
    });
}
function handlePing(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var url, ipsParam, ips, stopped, sliceOffset, batch, results;
        var _this = this;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    url = new URL((_a = req.url) !== null && _a !== void 0 ? _a : "", "http://localhost");
                    ipsParam = (_b = url.searchParams.get("ips")) !== null && _b !== void 0 ? _b : "";
                    ips = ipsParam
                        .split(",")
                        .map(function (ip) { return ip.trim(); })
                        .filter(Boolean);
                    if (ips.length === 0) {
                        res.writeHead(400, { "content-type": "application/json" });
                        res.end(JSON.stringify({ error: "No IPs provided" }));
                        return [2 /*return*/];
                    }
                    res.writeHead(200, {
                        "content-type": "text/event-stream",
                        "cache-control": "no-cache",
                        connection: "keep-alive",
                        "x-accel-buffering": "no",
                    });
                    stopped = false;
                    sliceOffset = 0;
                    req.on("close", function () {
                        stopped = true;
                    });
                    _c.label = 1;
                case 1:
                    if (!(!stopped && !res.writableEnded)) return [3 /*break*/, 4];
                    batch = ips.slice(sliceOffset, sliceOffset + MAX_IPS);
                    sliceOffset = (sliceOffset + MAX_IPS) % ips.length;
                    return [4 /*yield*/, Promise.all(batch.map(function (ip) { return __awaiter(_this, void 0, void 0, function () {
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _a = { ip: ip };
                                        return [4 /*yield*/, pingOnce(ip)];
                                    case 1: return [2 /*return*/, (_a.rtt = _b.sent(), _a)];
                                }
                            });
                        }); }))];
                case 2:
                    results = _c.sent();
                    if (!stopped && !res.writableEnded) {
                        res.write("event: ping\ndata: ".concat(JSON.stringify(results), "\n\n"));
                    }
                    if (stopped || res.writableEnded)
                        return [3 /*break*/, 4];
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, INTERVAL_MS); })];
                case 3:
                    _c.sent();
                    return [3 /*break*/, 1];
                case 4:
                    if (!res.writableEnded)
                        res.end();
                    return [2 /*return*/];
            }
        });
    });
}
