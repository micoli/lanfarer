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
exports.checkAcpOnline = checkAcpOnline;
exports.fetchAcpDeviceInfo = fetchAcpDeviceInfo;
exports.acpProbe = acpProbe;
var node_net_1 = require("node:net");
var PORT = 5009;
var MAGIC = Buffer.from("acpp");
var VERSION = 0x00030001; // version=3, type=1
function adler32(buf) {
    var s1 = 1;
    var s2 = 0;
    for (var _i = 0, buf_1 = buf; _i < buf_1.length; _i++) {
        var b = buf_1[_i];
        s1 = (s1 + b) % 65521;
        s2 = (s2 + s1) % 65521;
    }
    return (s2 << 16) | s1;
}
function buildClientHello() {
    var pkt = Buffer.alloc(128);
    MAGIC.copy(pkt, 0);
    pkt.writeUInt16BE(3, 4); // version
    pkt.writeUInt16BE(0x0000, 6); // client-hello
    pkt.writeUInt32BE(1, 12); // seq=1
    return pkt;
}
function buildCommand(cmd, body) {
    if (body === void 0) { body = Buffer.alloc(0); }
    var bodyChk = body.length === 0 ? 1 : adler32(body);
    var hdr = Buffer.alloc(28);
    MAGIC.copy(hdr, 0);
    hdr.writeUInt32BE(VERSION, 4);
    hdr.writeUInt16BE(cmd, 8);
    hdr.writeUInt16BE(0, 10); // flags
    hdr.writeUInt32BE(0, 12); // err
    hdr.writeUInt32BE(body.length, 16);
    hdr.writeUInt32BE(bodyChk, 20);
    hdr.writeUInt32BE(adler32(hdr), 24);
    return Buffer.concat([hdr, body]);
}
function parseResponse(buf) {
    if (buf.length < 28)
        return null;
    var cmd = buf.readUInt16BE(8);
    var err = buf.readInt32BE(12);
    var bsz = buf.readUInt32BE(16);
    var body = buf.subarray(28, 28 + bsz);
    return { cmd: cmd, err: err, bsz: bsz, body: body };
}
function parseCFB0(buf) {
    // ACP uses a simple TLV-like format: type byte + null-terminated strings
    // type 0xd0 = dict, 0x70 = string value (prefixed with 'p')
    var result = {};
    var i = 0;
    var currentKey = null;
    var values = [];
    while (i < buf.length) {
        var b = buf[i];
        if (b === 0xd0) {
            // Start of dict/array
            i++;
        }
        else if (b === 0x70) {
            // String (p-prefixed)
            i++;
            var end = buf.indexOf(0, i);
            if (end < 0)
                break;
            var s = buf.subarray(i, end).toString("utf8");
            i = end + 1;
            if (currentKey === null) {
                currentKey = s;
            }
            else {
                values.push(s);
                if (currentKey && !s.startsWith("p") && values.length === 1) {
                    result[currentKey] = s;
                    currentKey = null;
                    values.length = 0;
                }
            }
        }
        else if (b === 0x00) {
            // End of value/section
            if (currentKey && values.length > 0) {
                result[currentKey] = values.length === 1 ? values[0] : __spreadArray([], values, true);
                currentKey = null;
                values.length = 0;
            }
            i++;
        }
        else {
            i++;
        }
    }
    return result;
}
function parseFeaturesPayload(body) {
    if (body.length < 4)
        return {};
    // Skip 4-byte header (CFB0 magic)
    var props = parseCFB0(body.subarray(4));
    var featureList = [];
    for (var _i = 0, _a = Object.keys(props); _i < _a.length; _i++) {
        var k = _a[_i];
        if (k === "features" || k === "featur")
            continue;
        if (k === "acpProperties")
            continue;
        if (k === "problems")
            continue;
        if (k === "laMA" || k === "raMA" || k === "waMA")
            continue;
        // Features are the 4-char keys that aren't MAC/property names
        if (k.length <= 4 && /^[a-zA-Z0-9!]+$/.test(k))
            featureList.push(k);
    }
    return {
        laMA: typeof props["laMA"] === "string" ? props["laMA"] : undefined,
        raMA: typeof props["raMA"] === "string" ? props["raMA"] : undefined,
        waMA: typeof props["waMA"] === "string" ? props["waMA"] : undefined,
        features: featureList.length > 0 ? featureList : undefined,
    };
}
// ── Public API ────────────────────────────────────────────────────────────────
function checkAcpOnline(host) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    var socket = new node_net_1.default.Socket();
                    socket.setTimeout(3000);
                    socket.on("error", function () { return resolve(false); });
                    socket.on("timeout", function () {
                        socket.destroy();
                        resolve(false);
                    });
                    socket.connect(PORT, host, function () {
                        var hello = buildClientHello();
                        socket.write(hello);
                        var buf = Buffer.alloc(0);
                        socket.on("data", function (chunk) {
                            buf = Buffer.concat([buf, chunk]);
                            if (buf.length >= 8 && buf.subarray(0, 4).equals(MAGIC)) {
                                socket.destroy();
                                resolve(true);
                            }
                        });
                        socket.on("close", function () { return resolve(buf.length > 0); });
                    });
                })];
        });
    });
}
function fetchAcpDeviceInfo(host) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    var socket = new node_net_1.default.Socket();
                    socket.setTimeout(5000);
                    var stage = "hello";
                    var buf = Buffer.alloc(0);
                    socket.on("error", function () { return resolve(null); });
                    socket.on("timeout", function () {
                        socket.destroy();
                        resolve(null);
                    });
                    socket.connect(PORT, host, function () {
                        socket.write(buildClientHello());
                    });
                    socket.on("data", function (chunk) {
                        buf = Buffer.concat([buf, chunk]);
                        if (stage === "hello" && buf.length >= 128) {
                            stage = "features";
                            buf = Buffer.alloc(0);
                            socket.write(buildCommand(0x1b));
                            return;
                        }
                        if (stage === "features" && buf.length >= 28) {
                            var parsed = parseResponse(buf);
                            socket.destroy();
                            if (parsed && parsed.err === 0 && parsed.bsz > 0) {
                                resolve(parseFeaturesPayload(parsed.body));
                            }
                            else {
                                resolve(null);
                            }
                        }
                    });
                    socket.on("close", function () { return resolve(null); });
                })];
        });
    });
}
function acpProbe(host) {
    return __awaiter(this, void 0, void 0, function () {
        var results, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    results = [];
                    return [4 /*yield*/, new Promise(function (resolve) {
                            var socket = new node_net_1.default.Socket();
                            socket.setTimeout(5000);
                            socket.on("error", function (e) { return resolve({ step: "connect-error", hex: e.message }); });
                            socket.on("timeout", function () {
                                socket.destroy();
                                resolve(null);
                            });
                            socket.connect(PORT, host, function () {
                                socket.write(buildClientHello());
                                var buf = Buffer.alloc(0);
                                var gotHello = false;
                                socket.on("data", function (chunk) {
                                    buf = Buffer.concat([buf, chunk]);
                                    if (!gotHello && buf.length >= 128) {
                                        gotHello = true;
                                        var type = buf.readUInt16BE(6);
                                        var sessionId = buf.subarray(8, 12).toString("hex");
                                        var serverNonce = buf.subarray(32, 36).toString("hex");
                                        results.push({
                                            step: "server-hello type=0x".concat(type.toString(16), " session=").concat(sessionId, " nonce=").concat(serverNonce),
                                            hex: buf.subarray(0, 128).toString("hex"),
                                        });
                                        // Now send Features command
                                        buf = Buffer.alloc(0);
                                        socket.write(buildCommand(0x1b));
                                    }
                                    else if (gotHello) {
                                        // Collecting features response
                                    }
                                });
                                socket.on("close", function () {
                                    if (gotHello && buf.length > 0) {
                                        var parsed = parseResponse(buf);
                                        if (parsed) {
                                            results.push({
                                                step: "features cmd=0x".concat(parsed.cmd.toString(16), " err=").concat(parsed.err, " bsz=").concat(parsed.bsz),
                                                hex: buf.toString("hex"),
                                            });
                                        }
                                    }
                                    resolve(results.length > 0 ? results[results.length - 1] : null);
                                });
                            });
                        })];
                case 1:
                    result = _a.sent();
                    if (result && !results.includes(result))
                        results.push(result);
                    return [2 /*return*/, results];
            }
        });
    });
}
