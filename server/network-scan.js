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
exports.detectSubnet = detectSubnet;
exports.cidrToIps = cidrToIps;
exports.runScan = runScan;
var node_os_1 = require("node:os");
var node_net_1 = require("node:net");
var promises_1 = require("node:dns/promises");
var node_child_process_1 = require("node:child_process");
var node_util_1 = require("node:util");
var mac_vendor_ts_1 = require("./mac-vendor.ts");
var host_probe_ts_1 = require("./host-probe.ts");
var execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
// Whether ping failed due to missing CAP_NET_RAW (Docker without raw socket capability).
var pingPermissionDenied = false;
function tcpProbe(ip, port, timeoutMs) {
    if (timeoutMs === void 0) { timeoutMs = 800; }
    return new Promise(function (resolve) {
        var s = new node_net_1.default.Socket();
        var t = setTimeout(function () { s.destroy(); resolve(false); }, timeoutMs);
        s.connect(port, ip, function () { clearTimeout(t); s.destroy(); resolve(true); });
        s.on("error", function () { clearTimeout(t); resolve(false); });
    });
}
// Returns true if the host responds to ping or, in Docker (no CAP_NET_RAW), to any TCP probe.
function isAlive(ip) {
    return __awaiter(this, void 0, void 0, function () {
        var err_1, msg, results;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!!pingPermissionDenied) return [3 /*break*/, 4];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, execAsync("ping -c 1 -W 1 \"".concat(ip, "\""), { timeout: 2000 })];
                case 2:
                    _b.sent();
                    return [2 /*return*/, true];
                case 3:
                    err_1 = _b.sent();
                    msg = String((_a = err_1.stderr) !== null && _a !== void 0 ? _a : err_1);
                    if (msg.includes("Operation not permitted") || msg.includes("permission")) {
                        if (!pingPermissionDenied) {
                            console.warn("[scan] ping: Operation not permitted — falling back to TCP probing (no CAP_NET_RAW in this container)");
                            pingPermissionDenied = true;
                        }
                    }
                    else {
                        return [2 /*return*/, false];
                    }
                    return [3 /*break*/, 4];
                case 4: return [4 /*yield*/, Promise.all([80, 443, 22, 8080, 445].map(function (p) { return tcpProbe(ip, p); }))];
                case 5:
                    results = _b.sent();
                    return [2 /*return*/, results.some(Boolean)];
            }
        });
    });
}
function detectSubnet() {
    for (var _i = 0, _a = Object.values(node_os_1.default.networkInterfaces()); _i < _a.length; _i++) {
        var ifaces = _a[_i];
        for (var _b = 0, _c = ifaces !== null && ifaces !== void 0 ? ifaces : []; _b < _c.length; _b++) {
            var addr = _c[_b];
            if (addr.family === "IPv4" && !addr.internal) {
                var p = addr.address.split(".");
                return "".concat(p[0], ".").concat(p[1], ".").concat(p[2], ".0/24");
            }
        }
    }
    return "192.168.1.0/24";
}
function cidrToIps(cidr) {
    var base = cidr.split("/")[0];
    var p = base.split(".").map(Number);
    return Array.from({ length: 254 }, function (_, i) { return "".concat(p[0], ".").concat(p[1], ".").concat(p[2], ".").concat(i + 1); });
}
function scanIp(ip) {
    return __awaiter(this, void 0, void 0, function () {
        var mac, stdout, m, err_2, hostname, names, _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, isAlive(ip)];
                case 1:
                    if (!(_c.sent()))
                        return [2 /*return*/, null];
                    mac = "";
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, execAsync("arp -n \"".concat(ip, "\""))];
                case 3:
                    stdout = (_c.sent()).stdout;
                    m = stdout.match(/([0-9a-f]{1,2}(?::[0-9a-f]{1,2}){5})/i);
                    if (m)
                        mac = m[1].toLowerCase();
                    return [3 /*break*/, 5];
                case 4:
                    err_2 = _c.sent();
                    console.debug("[scan] arp ".concat(ip, ": ").concat(err_2.message));
                    return [3 /*break*/, 5];
                case 5:
                    hostname = "";
                    _c.label = 6;
                case 6:
                    _c.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, promises_1.default.reverse(ip)];
                case 7:
                    names = _c.sent();
                    hostname = (_b = names[0]) !== null && _b !== void 0 ? _b : "";
                    return [3 /*break*/, 9];
                case 8:
                    _a = _c.sent();
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/, { mac: mac, hostname: hostname }];
            }
        });
    });
}
function runScan(subnet, send, signal) {
    return __awaiter(this, void 0, void 0, function () {
        var ips, total, done, detailPromises;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, mac_vendor_ts_1.loadVendorDb)()];
                case 1:
                    _a.sent();
                    ips = cidrToIps(subnet);
                    total = ips.length;
                    done = 0;
                    detailPromises = [];
                    return [4 /*yield*/, Promise.all(Array.from({ length: 10 }, function (_, worker) { return __awaiter(_this, void 0, void 0, function () {
                            var i, ip, result;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        i = worker;
                                        _a.label = 1;
                                    case 1:
                                        if (!(i < ips.length)) return [3 /*break*/, 4];
                                        if (signal.aborted)
                                            return [2 /*return*/];
                                        ip = ips[i];
                                        return [4 /*yield*/, scanIp(ip)];
                                    case 2:
                                        result = _a.sent();
                                        done++;
                                        send("progress", JSON.stringify({ done: done, total: total }));
                                        if (result !== null) {
                                            send("host", JSON.stringify({
                                                ip: ip,
                                                mac: result.mac,
                                                hostname: result.hostname,
                                                vendor: result.mac ? (0, mac_vendor_ts_1.lookupVendor)(result.mac) : "",
                                                ping: true,
                                            }));
                                            detailPromises.push((0, host_probe_ts_1.probeHostDetails)(ip, result.hostname)
                                                .then(function (detail) { if (!signal.aborted)
                                                send("host-detail", JSON.stringify(detail)); })
                                                .catch(function () { }));
                                        }
                                        _a.label = 3;
                                    case 3:
                                        i += 10;
                                        return [3 /*break*/, 1];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, Promise.all(detailPromises)];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
