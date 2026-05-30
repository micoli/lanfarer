"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCookieValue = extractCookieValue;
exports.makeRequest = makeRequest;
exports.makeRequestAsync = makeRequestAsync;
exports.buildPort = buildPort;
var node_http_1 = require("node:http");
var node_https_1 = require("node:https");
var config_ts_1 = require("./config.ts");
var config_ts_2 = require("./config.ts");
var REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);
var MAX_REDIRECTS = 5;
function extractCookieValue(setCookieHeaders, name) {
    var re = new RegExp("".concat(name, "=([^;]+)"), "i");
    for (var _i = 0, setCookieHeaders_1 = setCookieHeaders; _i < setCookieHeaders_1.length; _i++) {
        var h = setCookieHeaders_1[_i];
        var m = h.match(re);
        if (m)
            return m[1];
    }
    return "";
}
function makeRequest(opts, body, depth, captured, resolve, reject) {
    if (depth > MAX_REDIRECTS) {
        reject(new Error("Too many redirects"));
        return;
    }
    var transport = opts.protocol === "http:" ? node_http_1.default : node_https_1.default;
    var req = transport.request(opts, function (res) {
        var chunks = [];
        res.on("data", function (c) { return chunks.push(c); });
        res.on("end", function () {
            var _a, _b, _c;
            var responseBody = Buffer.concat(chunks);
            var setCookies = (_a = res.headers["set-cookie"]) !== null && _a !== void 0 ? _a : [];
            if (config_ts_2.VERBOSE) {
                console.log("[proxy] hop depth=".concat(depth, " status=").concat(res.statusCode, " path=").concat(opts.path));
                if (responseBody.length)
                    console.log("[proxy] body:", responseBody.toString().slice(0, 300));
            }
            var bboxId = extractCookieValue(setCookies, "BBOX_ID");
            if (bboxId)
                captured.bboxId = bboxId;
            var btoken = extractCookieValue(setCookies, "btoken");
            if (btoken)
                captured.btoken = btoken;
            if (REDIRECT_CODES.has((_b = res.statusCode) !== null && _b !== void 0 ? _b : 0) && res.headers.location) {
                var location_1 = res.headers.location;
                var redirectUrl = location_1.startsWith("http")
                    ? new URL(location_1)
                    : new URL(location_1, "".concat(opts.protocol, "//").concat(opts.hostname));
                var isRedirectHttps = redirectUrl.protocol === "https:";
                var redirectHeaders = __assign(__assign({}, opts.headers), { host: redirectUrl.host });
                var cookieParts = [];
                if (captured.bboxId)
                    cookieParts.push("BBOX_ID=".concat(captured.bboxId));
                if (captured.btoken)
                    cookieParts.push("btoken=".concat(captured.btoken));
                if (cookieParts.length)
                    redirectHeaders["cookie"] = cookieParts.join("; ");
                makeRequest({
                    hostname: redirectUrl.hostname,
                    port: redirectUrl.port ? Number(redirectUrl.port) : isRedirectHttps ? 443 : 80,
                    path: redirectUrl.pathname + redirectUrl.search,
                    method: res.statusCode === 303 ? "GET" : opts.method,
                    headers: redirectHeaders,
                    protocol: redirectUrl.protocol,
                    rejectUnauthorized: false,
                }, res.statusCode === 303 ? Buffer.alloc(0) : body, depth + 1, captured, resolve, reject);
            }
            else {
                resolve((_c = res.statusCode) !== null && _c !== void 0 ? _c : 502, res.headers, responseBody);
            }
        });
        res.on("error", reject);
    });
    req.on("error", reject);
    if (body.length)
        req.write(body);
    req.end();
}
function makeRequestAsync(opts, body, captured) {
    return new Promise(function (resolve, reject) {
        return makeRequest(opts, body, 0, captured, function (statusCode, headers, body) { return resolve({ statusCode: statusCode, headers: headers, body: body }); }, reject);
    });
}
function buildPort() {
    return config_ts_1.isHttps ? 443 : 80;
}
