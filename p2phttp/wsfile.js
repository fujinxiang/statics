(function (f) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = f();
  } else if (typeof define === "function" && define.amd) {
    define([], f);
  } else {
    var g;
    if (typeof window !== "undefined") {
      g = window;
    } else if (typeof global !== "undefined") {
      g = global;
    } else if (typeof self !== "undefined") {
      g = self;
    } else {
      g = this;
    }
    g.WSFile = f();
  }
})(function () {
  var define, module, exports;
  return (function () {
    function r(e, n, t) {
      function o(i, f) {
        if (!n[i]) {
          if (!e[i]) {
            var c = "function" == typeof require && require;
            if (!f && c) return c(i, !0);
            if (u) return u(i, !0);
            var a = new Error("Cannot find module '" + i + "'");
            throw ((a.code = "MODULE_NOT_FOUND"), a);
          }
          var p = (n[i] = { exports: {} });
          e[i][0].call(
            p.exports,
            function (r) {
              var n = e[i][1][r];
              return o(n || r);
            },
            p,
            p.exports,
            r,
            e,
            n,
            t
          );
        }
        return n[i].exports;
      }
      for (
        var u = "function" == typeof require && require, i = 0;
        i < t.length;
        i++
      )
        o(t[i]);
      return o;
    }
    return r;
  })()(
    {
      1: [
        function (require, module, exports) {
          "use strict";

          exports.byteLength = byteLength;
          exports.toByteArray = toByteArray;
          exports.fromByteArray = fromByteArray;

          var lookup = [];
          var revLookup = [];
          var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;

          var code =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
          for (var i = 0, len = code.length; i < len; ++i) {
            lookup[i] = code[i];
            revLookup[code.charCodeAt(i)] = i;
          }

          // Support decoding URL-safe base64 strings, as Node.js does.
          // See: https://en.wikipedia.org/wiki/Base64#URL_applications
          revLookup["-".charCodeAt(0)] = 62;
          revLookup["_".charCodeAt(0)] = 63;

          function getLens(b64) {
            var len = b64.length;

            if (len % 4 > 0) {
              throw new Error("Invalid string. Length must be a multiple of 4");
            }

            // Trim off extra bytes after placeholder bytes are found
            // See: https://github.com/beatgammit/base64-js/issues/42
            var validLen = b64.indexOf("=");
            if (validLen === -1) validLen = len;

            var placeHoldersLen = validLen === len ? 0 : 4 - (validLen % 4);

            return [validLen, placeHoldersLen];
          }

          // base64 is 4/3 + up to two characters of the original data
          function byteLength(b64) {
            var lens = getLens(b64);
            var validLen = lens[0];
            var placeHoldersLen = lens[1];
            return ((validLen + placeHoldersLen) * 3) / 4 - placeHoldersLen;
          }

          function _byteLength(b64, validLen, placeHoldersLen) {
            return ((validLen + placeHoldersLen) * 3) / 4 - placeHoldersLen;
          }

          function toByteArray(b64) {
            var tmp;
            var lens = getLens(b64);
            var validLen = lens[0];
            var placeHoldersLen = lens[1];

            var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));

            var curByte = 0;

            // if there are placeholders, only get up to the last complete 4 chars
            var len = placeHoldersLen > 0 ? validLen - 4 : validLen;

            var i;
            for (i = 0; i < len; i += 4) {
              tmp =
                (revLookup[b64.charCodeAt(i)] << 18) |
                (revLookup[b64.charCodeAt(i + 1)] << 12) |
                (revLookup[b64.charCodeAt(i + 2)] << 6) |
                revLookup[b64.charCodeAt(i + 3)];
              arr[curByte++] = (tmp >> 16) & 0xff;
              arr[curByte++] = (tmp >> 8) & 0xff;
              arr[curByte++] = tmp & 0xff;
            }

            if (placeHoldersLen === 2) {
              tmp =
                (revLookup[b64.charCodeAt(i)] << 2) |
                (revLookup[b64.charCodeAt(i + 1)] >> 4);
              arr[curByte++] = tmp & 0xff;
            }

            if (placeHoldersLen === 1) {
              tmp =
                (revLookup[b64.charCodeAt(i)] << 10) |
                (revLookup[b64.charCodeAt(i + 1)] << 4) |
                (revLookup[b64.charCodeAt(i + 2)] >> 2);
              arr[curByte++] = (tmp >> 8) & 0xff;
              arr[curByte++] = tmp & 0xff;
            }

            return arr;
          }

          function tripletToBase64(num) {
            return (
              lookup[(num >> 18) & 0x3f] +
              lookup[(num >> 12) & 0x3f] +
              lookup[(num >> 6) & 0x3f] +
              lookup[num & 0x3f]
            );
          }

          function encodeChunk(uint8, start, end) {
            var tmp;
            var output = [];
            for (var i = start; i < end; i += 3) {
              tmp =
                ((uint8[i] << 16) & 0xff0000) +
                ((uint8[i + 1] << 8) & 0xff00) +
                (uint8[i + 2] & 0xff);
              output.push(tripletToBase64(tmp));
            }
            return output.join("");
          }

          function fromByteArray(uint8) {
            var tmp;
            var len = uint8.length;
            var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
            var parts = [];
            var maxChunkLength = 16383; // must be multiple of 3

            // go through the array every three bytes, we'll deal with trailing stuff later
            for (
              var i = 0, len2 = len - extraBytes;
              i < len2;
              i += maxChunkLength
            ) {
              parts.push(
                encodeChunk(
                  uint8,
                  i,
                  i + maxChunkLength > len2 ? len2 : i + maxChunkLength
                )
              );
            }

            // pad the end with zeros, but make sure to not forget the extra bytes
            if (extraBytes === 1) {
              tmp = uint8[len - 1];
              parts.push(lookup[tmp >> 2] + lookup[(tmp << 4) & 0x3f] + "==");
            } else if (extraBytes === 2) {
              tmp = (uint8[len - 2] << 8) + uint8[len - 1];
              parts.push(
                lookup[tmp >> 10] +
                  lookup[(tmp >> 4) & 0x3f] +
                  lookup[(tmp << 2) & 0x3f] +
                  "="
              );
            }

            return parts.join("");
          }
        },
        {},
      ],
      2: [
        function (require, module, exports) {
          module.exports = function (haystack, needle, comparator, low, high) {
            var mid, cmp;

            if (low === undefined) low = 0;
            else {
              low = low | 0;
              if (low < 0 || low >= haystack.length)
                throw new RangeError("invalid lower bound");
            }

            if (high === undefined) high = haystack.length - 1;
            else {
              high = high | 0;
              if (high < low || high >= haystack.length)
                throw new RangeError("invalid upper bound");
            }

            while (low <= high) {
              // The naive `low + high >>> 1` could fail for array lengths > 2**31
              // because `>>>` converts its operands to int32. `low + (high - low >>> 1)`
              // works for array lengths <= 2**32-1 which is also Javascript's max array
              // length.
              mid = low + ((high - low) >>> 1);
              cmp = +comparator(haystack[mid], needle, mid, haystack);

              // Too low.
              if (cmp < 0.0) low = mid + 1;
              // Too high.
              else if (cmp > 0.0) high = mid - 1;
              // Key found.
              else return mid;
            }

            // Key not found.
            return ~low;
          };
        },
        {},
      ],
      3: [function (require, module, exports) {}, {}],
      4: [
        function (require, module, exports) {
          (function (Buffer) {
            (function () {
              function allocUnsafe(size) {
                if (typeof size !== "number") {
                  throw new TypeError('"size" argument must be a number');
                }

                if (size < 0) {
                  throw new RangeError('"size" argument must not be negative');
                }

                if (Buffer.allocUnsafe) {
                  return Buffer.allocUnsafe(size);
                } else {
                  return new Buffer(size);
                }
              }

              module.exports = allocUnsafe;
            }.call(this));
          }.call(this, require("buffer").Buffer));
        },
        { buffer: 7 },
      ],
      5: [
        function (require, module, exports) {
          (function (Buffer) {
            (function () {
              var bufferFill = require("buffer-fill");
              var allocUnsafe = require("buffer-alloc-unsafe");

              module.exports = function alloc(size, fill, encoding) {
                if (typeof size !== "number") {
                  throw new TypeError('"size" argument must be a number');
                }

                if (size < 0) {
                  throw new RangeError('"size" argument must not be negative');
                }

                if (Buffer.alloc) {
                  return Buffer.alloc(size, fill, encoding);
                }

                var buffer = allocUnsafe(size);

                if (size === 0) {
                  return buffer;
                }

                if (fill === undefined) {
                  return bufferFill(buffer, 0);
                }

                if (typeof encoding !== "string") {
                  encoding = undefined;
                }

                return bufferFill(buffer, fill, encoding);
              };
            }.call(this));
          }.call(this, require("buffer").Buffer));
        },
        { buffer: 7, "buffer-alloc-unsafe": 4, "buffer-fill": 6 },
      ],
      6: [
        function (require, module, exports) {
          (function (Buffer) {
            (function () {
              /* Node.js 6.4.0 and up has full support */
              var hasFullSupport = (function () {
                try {
                  if (!Buffer.isEncoding("latin1")) {
                    return false;
                  }

                  var buf = Buffer.alloc ? Buffer.alloc(4) : new Buffer(4);

                  buf.fill("ab", "ucs2");

                  return buf.toString("hex") === "61006200";
                } catch (_) {
                  return false;
                }
              })();

              function isSingleByte(val) {
                return val.length === 1 && val.charCodeAt(0) < 256;
              }

              function fillWithNumber(buffer, val, start, end) {
                if (start < 0 || end > buffer.length) {
                  throw new RangeError("Out of range index");
                }

                start = start >>> 0;
                end = end === undefined ? buffer.length : end >>> 0;

                if (end > start) {
                  buffer.fill(val, start, end);
                }

                return buffer;
              }

              function fillWithBuffer(buffer, val, start, end) {
                if (start < 0 || end > buffer.length) {
                  throw new RangeError("Out of range index");
                }

                if (end <= start) {
                  return buffer;
                }

                start = start >>> 0;
                end = end === undefined ? buffer.length : end >>> 0;

                var pos = start;
                var len = val.length;
                while (pos <= end - len) {
                  val.copy(buffer, pos);
                  pos += len;
                }

                if (pos !== end) {
                  val.copy(buffer, pos, 0, end - pos);
                }

                return buffer;
              }

              function fill(buffer, val, start, end, encoding) {
                if (hasFullSupport) {
                  return buffer.fill(val, start, end, encoding);
                }

                if (typeof val === "number") {
                  return fillWithNumber(buffer, val, start, end);
                }

                if (typeof val === "string") {
                  if (typeof start === "string") {
                    encoding = start;
                    start = 0;
                    end = buffer.length;
                  } else if (typeof end === "string") {
                    encoding = end;
                    end = buffer.length;
                  }

                  if (encoding !== undefined && typeof encoding !== "string") {
                    throw new TypeError("encoding must be a string");
                  }

                  if (encoding === "latin1") {
                    encoding = "binary";
                  }

                  if (
                    typeof encoding === "string" &&
                    !Buffer.isEncoding(encoding)
                  ) {
                    throw new TypeError("Unknown encoding: " + encoding);
                  }

                  if (val === "") {
                    return fillWithNumber(buffer, 0, start, end);
                  }

                  if (isSingleByte(val)) {
                    return fillWithNumber(
                      buffer,
                      val.charCodeAt(0),
                      start,
                      end
                    );
                  }

                  val = new Buffer(val, encoding);
                }

                if (Buffer.isBuffer(val)) {
                  return fillWithBuffer(buffer, val, start, end);
                }

                // Other values (e.g. undefined, boolean, object) results in zero-fill
                return fillWithNumber(buffer, 0, start, end);
              }

              module.exports = fill;
            }.call(this));
          }.call(this, require("buffer").Buffer));
        },
        { buffer: 7 },
      ],
      7: [
        function (require, module, exports) {
          (function (Buffer) {
            (function () {
              /*!
               * The buffer module from node.js, for the browser.
               *
               * @author   Feross Aboukhadijeh <https://feross.org>
               * @license  MIT
               */
              /* eslint-disable no-proto */

              "use strict";

              var base64 = require("base64-js");
              var ieee754 = require("ieee754");

              exports.Buffer = Buffer;
              exports.SlowBuffer = SlowBuffer;
              exports.INSPECT_MAX_BYTES = 50;

              var K_MAX_LENGTH = 0x7fffffff;
              exports.kMaxLength = K_MAX_LENGTH;

              /**
               * If `Buffer.TYPED_ARRAY_SUPPORT`:
               *   === true    Use Uint8Array implementation (fastest)
               *   === false   Print warning and recommend using `buffer` v4.x which has an Object
               *               implementation (most compatible, even IE6)
               *
               * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
               * Opera 11.6+, iOS 4.2+.
               *
               * We report that the browser does not support typed arrays if the are not subclassable
               * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
               * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
               * for __proto__ and has a buggy typed array implementation.
               */
              Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();

              if (
                !Buffer.TYPED_ARRAY_SUPPORT &&
                typeof console !== "undefined" &&
                typeof console.error === "function"
              ) {
                console.error(
                  "This browser lacks typed array (Uint8Array) support which is required by " +
                    "`buffer` v5.x. Use `buffer` v4.x if you require old browser support."
                );
              }

              function typedArraySupport() {
                // Can typed array instances can be augmented?
                try {
                  var arr = new Uint8Array(1);
                  arr.__proto__ = {
                    __proto__: Uint8Array.prototype,
                    foo: function () {
                      return 42;
                    },
                  };
                  return arr.foo() === 42;
                } catch (e) {
                  return false;
                }
              }

              Object.defineProperty(Buffer.prototype, "parent", {
                enumerable: true,
                get: function () {
                  if (!Buffer.isBuffer(this)) return undefined;
                  return this.buffer;
                },
              });

              Object.defineProperty(Buffer.prototype, "offset", {
                enumerable: true,
                get: function () {
                  if (!Buffer.isBuffer(this)) return undefined;
                  return this.byteOffset;
                },
              });

              function createBuffer(length) {
                if (length > K_MAX_LENGTH) {
                  throw new RangeError(
                    'The value "' + length + '" is invalid for option "size"'
                  );
                }
                // Return an augmented `Uint8Array` instance
                var buf = new Uint8Array(length);
                buf.__proto__ = Buffer.prototype;
                return buf;
              }

              /**
               * The Buffer constructor returns instances of `Uint8Array` that have their
               * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
               * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
               * and the `Uint8Array` methods. Square bracket notation works as expected -- it
               * returns a single octet.
               *
               * The `Uint8Array` prototype remains unmodified.
               */

              function Buffer(arg, encodingOrOffset, length) {
                // Common case.
                if (typeof arg === "number") {
                  if (typeof encodingOrOffset === "string") {
                    throw new TypeError(
                      'The "string" argument must be of type string. Received type number'
                    );
                  }
                  return allocUnsafe(arg);
                }
                return from(arg, encodingOrOffset, length);
              }

              // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
              if (
                typeof Symbol !== "undefined" &&
                Symbol.species != null &&
                Buffer[Symbol.species] === Buffer
              ) {
                Object.defineProperty(Buffer, Symbol.species, {
                  value: null,
                  configurable: true,
                  enumerable: false,
                  writable: false,
                });
              }

              Buffer.poolSize = 8192; // not used by this implementation

              function from(value, encodingOrOffset, length) {
                if (typeof value === "string") {
                  return fromString(value, encodingOrOffset);
                }

                if (ArrayBuffer.isView(value)) {
                  return fromArrayLike(value);
                }

                if (value == null) {
                  throw TypeError(
                    "The first argument must be one of type string, Buffer, ArrayBuffer, Array, " +
                      "or Array-like Object. Received type " +
                      typeof value
                  );
                }

                if (
                  isInstance(value, ArrayBuffer) ||
                  (value && isInstance(value.buffer, ArrayBuffer))
                ) {
                  return fromArrayBuffer(value, encodingOrOffset, length);
                }

                if (typeof value === "number") {
                  throw new TypeError(
                    'The "value" argument must not be of type number. Received type number'
                  );
                }

                var valueOf = value.valueOf && value.valueOf();
                if (valueOf != null && valueOf !== value) {
                  return Buffer.from(valueOf, encodingOrOffset, length);
                }

                var b = fromObject(value);
                if (b) return b;

                if (
                  typeof Symbol !== "undefined" &&
                  Symbol.toPrimitive != null &&
                  typeof value[Symbol.toPrimitive] === "function"
                ) {
                  return Buffer.from(
                    value[Symbol.toPrimitive]("string"),
                    encodingOrOffset,
                    length
                  );
                }

                throw new TypeError(
                  "The first argument must be one of type string, Buffer, ArrayBuffer, Array, " +
                    "or Array-like Object. Received type " +
                    typeof value
                );
              }

              /**
               * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
               * if value is a number.
               * Buffer.from(str[, encoding])
               * Buffer.from(array)
               * Buffer.from(buffer)
               * Buffer.from(arrayBuffer[, byteOffset[, length]])
               **/
              Buffer.from = function (value, encodingOrOffset, length) {
                return from(value, encodingOrOffset, length);
              };

              // Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
              // https://github.com/feross/buffer/pull/148
              Buffer.prototype.__proto__ = Uint8Array.prototype;
              Buffer.__proto__ = Uint8Array;

              function assertSize(size) {
                if (typeof size !== "number") {
                  throw new TypeError('"size" argument must be of type number');
                } else if (size < 0) {
                  throw new RangeError(
                    'The value "' + size + '" is invalid for option "size"'
                  );
                }
              }

              function alloc(size, fill, encoding) {
                assertSize(size);
                if (size <= 0) {
                  return createBuffer(size);
                }
                if (fill !== undefined) {
                  // Only pay attention to encoding if it's a string. This
                  // prevents accidentally sending in a number that would
                  // be interpretted as a start offset.
                  return typeof encoding === "string"
                    ? createBuffer(size).fill(fill, encoding)
                    : createBuffer(size).fill(fill);
                }
                return createBuffer(size);
              }

              /**
               * Creates a new filled Buffer instance.
               * alloc(size[, fill[, encoding]])
               **/
              Buffer.alloc = function (size, fill, encoding) {
                return alloc(size, fill, encoding);
              };

              function allocUnsafe(size) {
                assertSize(size);
                return createBuffer(size < 0 ? 0 : checked(size) | 0);
              }

              /**
               * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
               * */
              Buffer.allocUnsafe = function (size) {
                return allocUnsafe(size);
              };
              /**
               * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
               */
              Buffer.allocUnsafeSlow = function (size) {
                return allocUnsafe(size);
              };

              function fromString(string, encoding) {
                if (typeof encoding !== "string" || encoding === "") {
                  encoding = "utf8";
                }

                if (!Buffer.isEncoding(encoding)) {
                  throw new TypeError("Unknown encoding: " + encoding);
                }

                var length = byteLength(string, encoding) | 0;
                var buf = createBuffer(length);

                var actual = buf.write(string, encoding);

                if (actual !== length) {
                  // Writing a hex string, for example, that contains invalid characters will
                  // cause everything after the first invalid character to be ignored. (e.g.
                  // 'abxxcd' will be treated as 'ab')
                  buf = buf.slice(0, actual);
                }

                return buf;
              }

              function fromArrayLike(array) {
                var length = array.length < 0 ? 0 : checked(array.length) | 0;
                var buf = createBuffer(length);
                for (var i = 0; i < length; i += 1) {
                  buf[i] = array[i] & 255;
                }
                return buf;
              }

              function fromArrayBuffer(array, byteOffset, length) {
                if (byteOffset < 0 || array.byteLength < byteOffset) {
                  throw new RangeError('"offset" is outside of buffer bounds');
                }

                if (array.byteLength < byteOffset + (length || 0)) {
                  throw new RangeError('"length" is outside of buffer bounds');
                }

                var buf;
                if (byteOffset === undefined && length === undefined) {
                  buf = new Uint8Array(array);
                } else if (length === undefined) {
                  buf = new Uint8Array(array, byteOffset);
                } else {
                  buf = new Uint8Array(array, byteOffset, length);
                }

                // Return an augmented `Uint8Array` instance
                buf.__proto__ = Buffer.prototype;
                return buf;
              }

              function fromObject(obj) {
                if (Buffer.isBuffer(obj)) {
                  var len = checked(obj.length) | 0;
                  var buf = createBuffer(len);

                  if (buf.length === 0) {
                    return buf;
                  }

                  obj.copy(buf, 0, 0, len);
                  return buf;
                }

                if (obj.length !== undefined) {
                  if (
                    typeof obj.length !== "number" ||
                    numberIsNaN(obj.length)
                  ) {
                    return createBuffer(0);
                  }
                  return fromArrayLike(obj);
                }

                if (obj.type === "Buffer" && Array.isArray(obj.data)) {
                  return fromArrayLike(obj.data);
                }
              }

              function checked(length) {
                // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
                // length is NaN (which is otherwise coerced to zero.)
                if (length >= K_MAX_LENGTH) {
                  throw new RangeError(
                    "Attempt to allocate Buffer larger than maximum " +
                      "size: 0x" +
                      K_MAX_LENGTH.toString(16) +
                      " bytes"
                  );
                }
                return length | 0;
              }

              function SlowBuffer(length) {
                if (+length != length) {
                  // eslint-disable-line eqeqeq
                  length = 0;
                }
                return Buffer.alloc(+length);
              }

              Buffer.isBuffer = function isBuffer(b) {
                return (
                  b != null && b._isBuffer === true && b !== Buffer.prototype
                ); // so Buffer.isBuffer(Buffer.prototype) will be false
              };

              Buffer.compare = function compare(a, b) {
                if (isInstance(a, Uint8Array))
                  a = Buffer.from(a, a.offset, a.byteLength);
                if (isInstance(b, Uint8Array))
                  b = Buffer.from(b, b.offset, b.byteLength);
                if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
                  throw new TypeError(
                    'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
                  );
                }

                if (a === b) return 0;

                var x = a.length;
                var y = b.length;

                for (var i = 0, len = Math.min(x, y); i < len; ++i) {
                  if (a[i] !== b[i]) {
                    x = a[i];
                    y = b[i];
                    break;
                  }
                }

                if (x < y) return -1;
                if (y < x) return 1;
                return 0;
              };

              Buffer.isEncoding = function isEncoding(encoding) {
                switch (String(encoding).toLowerCase()) {
                  case "hex":
                  case "utf8":
                  case "utf-8":
                  case "ascii":
                  case "latin1":
                  case "binary":
                  case "base64":
                  case "ucs2":
                  case "ucs-2":
                  case "utf16le":
                  case "utf-16le":
                    return true;
                  default:
                    return false;
                }
              };

              Buffer.concat = function concat(list, length) {
                if (!Array.isArray(list)) {
                  throw new TypeError(
                    '"list" argument must be an Array of Buffers'
                  );
                }

                if (list.length === 0) {
                  return Buffer.alloc(0);
                }

                var i;
                if (length === undefined) {
                  length = 0;
                  for (i = 0; i < list.length; ++i) {
                    length += list[i].length;
                  }
                }

                var buffer = Buffer.allocUnsafe(length);
                var pos = 0;
                for (i = 0; i < list.length; ++i) {
                  var buf = list[i];
                  if (isInstance(buf, Uint8Array)) {
                    buf = Buffer.from(buf);
                  }
                  if (!Buffer.isBuffer(buf)) {
                    throw new TypeError(
                      '"list" argument must be an Array of Buffers'
                    );
                  }
                  buf.copy(buffer, pos);
                  pos += buf.length;
                }
                return buffer;
              };

              function byteLength(string, encoding) {
                if (Buffer.isBuffer(string)) {
                  return string.length;
                }
                if (
                  ArrayBuffer.isView(string) ||
                  isInstance(string, ArrayBuffer)
                ) {
                  return string.byteLength;
                }
                if (typeof string !== "string") {
                  throw new TypeError(
                    'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
                      "Received type " +
                      typeof string
                  );
                }

                var len = string.length;
                var mustMatch = arguments.length > 2 && arguments[2] === true;
                if (!mustMatch && len === 0) return 0;

                // Use a for loop to avoid recursion
                var loweredCase = false;
                for (;;) {
                  switch (encoding) {
                    case "ascii":
                    case "latin1":
                    case "binary":
                      return len;
                    case "utf8":
                    case "utf-8":
                      return utf8ToBytes(string).length;
                    case "ucs2":
                    case "ucs-2":
                    case "utf16le":
                    case "utf-16le":
                      return len * 2;
                    case "hex":
                      return len >>> 1;
                    case "base64":
                      return base64ToBytes(string).length;
                    default:
                      if (loweredCase) {
                        return mustMatch ? -1 : utf8ToBytes(string).length; // assume utf8
                      }
                      encoding = ("" + encoding).toLowerCase();
                      loweredCase = true;
                  }
                }
              }
              Buffer.byteLength = byteLength;

              function slowToString(encoding, start, end) {
                var loweredCase = false;

                // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
                // property of a typed array.

                // This behaves neither like String nor Uint8Array in that we set start/end
                // to their upper/lower bounds if the value passed is out of range.
                // undefined is handled specially as per ECMA-262 6th Edition,
                // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
                if (start === undefined || start < 0) {
                  start = 0;
                }
                // Return early if start > this.length. Done here to prevent potential uint32
                // coercion fail below.
                if (start > this.length) {
                  return "";
                }

                if (end === undefined || end > this.length) {
                  end = this.length;
                }

                if (end <= 0) {
                  return "";
                }

                // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
                end >>>= 0;
                start >>>= 0;

                if (end <= start) {
                  return "";
                }

                if (!encoding) encoding = "utf8";

                while (true) {
                  switch (encoding) {
                    case "hex":
                      return hexSlice(this, start, end);

                    case "utf8":
                    case "utf-8":
                      return utf8Slice(this, start, end);

                    case "ascii":
                      return asciiSlice(this, start, end);

                    case "latin1":
                    case "binary":
                      return latin1Slice(this, start, end);

                    case "base64":
                      return base64Slice(this, start, end);

                    case "ucs2":
                    case "ucs-2":
                    case "utf16le":
                    case "utf-16le":
                      return utf16leSlice(this, start, end);

                    default:
                      if (loweredCase)
                        throw new TypeError("Unknown encoding: " + encoding);
                      encoding = (encoding + "").toLowerCase();
                      loweredCase = true;
                  }
                }
              }

              // This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
              // to detect a Buffer instance. It's not possible to use `instanceof Buffer`
              // reliably in a browserify context because there could be multiple different
              // copies of the 'buffer' package in use. This method works even for Buffer
              // instances that were created from another copy of the `buffer` package.
              // See: https://github.com/feross/buffer/issues/154
              Buffer.prototype._isBuffer = true;

              function swap(b, n, m) {
                var i = b[n];
                b[n] = b[m];
                b[m] = i;
              }

              Buffer.prototype.swap16 = function swap16() {
                var len = this.length;
                if (len % 2 !== 0) {
                  throw new RangeError(
                    "Buffer size must be a multiple of 16-bits"
                  );
                }
                for (var i = 0; i < len; i += 2) {
                  swap(this, i, i + 1);
                }
                return this;
              };

              Buffer.prototype.swap32 = function swap32() {
                var len = this.length;
                if (len % 4 !== 0) {
                  throw new RangeError(
                    "Buffer size must be a multiple of 32-bits"
                  );
                }
                for (var i = 0; i < len; i += 4) {
                  swap(this, i, i + 3);
                  swap(this, i + 1, i + 2);
                }
                return this;
              };

              Buffer.prototype.swap64 = function swap64() {
                var len = this.length;
                if (len % 8 !== 0) {
                  throw new RangeError(
                    "Buffer size must be a multiple of 64-bits"
                  );
                }
                for (var i = 0; i < len; i += 8) {
                  swap(this, i, i + 7);
                  swap(this, i + 1, i + 6);
                  swap(this, i + 2, i + 5);
                  swap(this, i + 3, i + 4);
                }
                return this;
              };

              Buffer.prototype.toString = function toString() {
                var length = this.length;
                if (length === 0) return "";
                if (arguments.length === 0) return utf8Slice(this, 0, length);
                return slowToString.apply(this, arguments);
              };

              Buffer.prototype.toLocaleString = Buffer.prototype.toString;

              Buffer.prototype.equals = function equals(b) {
                if (!Buffer.isBuffer(b))
                  throw new TypeError("Argument must be a Buffer");
                if (this === b) return true;
                return Buffer.compare(this, b) === 0;
              };

              Buffer.prototype.inspect = function inspect() {
                var str = "";
                var max = exports.INSPECT_MAX_BYTES;
                str = this.toString("hex", 0, max)
                  .replace(/(.{2})/g, "$1 ")
                  .trim();
                if (this.length > max) str += " ... ";
                return "<Buffer " + str + ">";
              };

              Buffer.prototype.compare = function compare(
                target,
                start,
                end,
                thisStart,
                thisEnd
              ) {
                if (isInstance(target, Uint8Array)) {
                  target = Buffer.from(
                    target,
                    target.offset,
                    target.byteLength
                  );
                }
                if (!Buffer.isBuffer(target)) {
                  throw new TypeError(
                    'The "target" argument must be one of type Buffer or Uint8Array. ' +
                      "Received type " +
                      typeof target
                  );
                }

                if (start === undefined) {
                  start = 0;
                }
                if (end === undefined) {
                  end = target ? target.length : 0;
                }
                if (thisStart === undefined) {
                  thisStart = 0;
                }
                if (thisEnd === undefined) {
                  thisEnd = this.length;
                }

                if (
                  start < 0 ||
                  end > target.length ||
                  thisStart < 0 ||
                  thisEnd > this.length
                ) {
                  throw new RangeError("out of range index");
                }

                if (thisStart >= thisEnd && start >= end) {
                  return 0;
                }
                if (thisStart >= thisEnd) {
                  return -1;
                }
                if (start >= end) {
                  return 1;
                }

                start >>>= 0;
                end >>>= 0;
                thisStart >>>= 0;
                thisEnd >>>= 0;

                if (this === target) return 0;

                var x = thisEnd - thisStart;
                var y = end - start;
                var len = Math.min(x, y);

                var thisCopy = this.slice(thisStart, thisEnd);
                var targetCopy = target.slice(start, end);

                for (var i = 0; i < len; ++i) {
                  if (thisCopy[i] !== targetCopy[i]) {
                    x = thisCopy[i];
                    y = targetCopy[i];
                    break;
                  }
                }

                if (x < y) return -1;
                if (y < x) return 1;
                return 0;
              };

              // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
              // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
              //
              // Arguments:
              // - buffer - a Buffer to search
              // - val - a string, Buffer, or number
              // - byteOffset - an index into `buffer`; will be clamped to an int32
              // - encoding - an optional encoding, relevant is val is a string
              // - dir - true for indexOf, false for lastIndexOf
              function bidirectionalIndexOf(
                buffer,
                val,
                byteOffset,
                encoding,
                dir
              ) {
                // Empty buffer means no match
                if (buffer.length === 0) return -1;

                // Normalize byteOffset
                if (typeof byteOffset === "string") {
                  encoding = byteOffset;
                  byteOffset = 0;
                } else if (byteOffset > 0x7fffffff) {
                  byteOffset = 0x7fffffff;
                } else if (byteOffset < -0x80000000) {
                  byteOffset = -0x80000000;
                }
                byteOffset = +byteOffset; // Coerce to Number.
                if (numberIsNaN(byteOffset)) {
                  // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
                  byteOffset = dir ? 0 : buffer.length - 1;
                }

                // Normalize byteOffset: negative offsets start from the end of the buffer
                if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
                if (byteOffset >= buffer.length) {
                  if (dir) return -1;
                  else byteOffset = buffer.length - 1;
                } else if (byteOffset < 0) {
                  if (dir) byteOffset = 0;
                  else return -1;
                }

                // Normalize val
                if (typeof val === "string") {
                  val = Buffer.from(val, encoding);
                }

                // Finally, search either indexOf (if dir is true) or lastIndexOf
                if (Buffer.isBuffer(val)) {
                  // Special case: looking for empty string/buffer always fails
                  if (val.length === 0) {
                    return -1;
                  }
                  return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
                } else if (typeof val === "number") {
                  val = val & 0xff; // Search for a byte value [0-255]
                  if (typeof Uint8Array.prototype.indexOf === "function") {
                    if (dir) {
                      return Uint8Array.prototype.indexOf.call(
                        buffer,
                        val,
                        byteOffset
                      );
                    } else {
                      return Uint8Array.prototype.lastIndexOf.call(
                        buffer,
                        val,
                        byteOffset
                      );
                    }
                  }
                  return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
                }

                throw new TypeError("val must be string, number or Buffer");
              }

              function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
                var indexSize = 1;
                var arrLength = arr.length;
                var valLength = val.length;

                if (encoding !== undefined) {
                  encoding = String(encoding).toLowerCase();
                  if (
                    encoding === "ucs2" ||
                    encoding === "ucs-2" ||
                    encoding === "utf16le" ||
                    encoding === "utf-16le"
                  ) {
                    if (arr.length < 2 || val.length < 2) {
                      return -1;
                    }
                    indexSize = 2;
                    arrLength /= 2;
                    valLength /= 2;
                    byteOffset /= 2;
                  }
                }

                function read(buf, i) {
                  if (indexSize === 1) {
                    return buf[i];
                  } else {
                    return buf.readUInt16BE(i * indexSize);
                  }
                }

                var i;
                if (dir) {
                  var foundIndex = -1;
                  for (i = byteOffset; i < arrLength; i++) {
                    if (
                      read(arr, i) ===
                      read(val, foundIndex === -1 ? 0 : i - foundIndex)
                    ) {
                      if (foundIndex === -1) foundIndex = i;
                      if (i - foundIndex + 1 === valLength)
                        return foundIndex * indexSize;
                    } else {
                      if (foundIndex !== -1) i -= i - foundIndex;
                      foundIndex = -1;
                    }
                  }
                } else {
                  if (byteOffset + valLength > arrLength)
                    byteOffset = arrLength - valLength;
                  for (i = byteOffset; i >= 0; i--) {
                    var found = true;
                    for (var j = 0; j < valLength; j++) {
                      if (read(arr, i + j) !== read(val, j)) {
                        found = false;
                        break;
                      }
                    }
                    if (found) return i;
                  }
                }

                return -1;
              }

              Buffer.prototype.includes = function includes(
                val,
                byteOffset,
                encoding
              ) {
                return this.indexOf(val, byteOffset, encoding) !== -1;
              };

              Buffer.prototype.indexOf = function indexOf(
                val,
                byteOffset,
                encoding
              ) {
                return bidirectionalIndexOf(
                  this,
                  val,
                  byteOffset,
                  encoding,
                  true
                );
              };

              Buffer.prototype.lastIndexOf = function lastIndexOf(
                val,
                byteOffset,
                encoding
              ) {
                return bidirectionalIndexOf(
                  this,
                  val,
                  byteOffset,
                  encoding,
                  false
                );
              };

              function hexWrite(buf, string, offset, length) {
                offset = Number(offset) || 0;
                var remaining = buf.length - offset;
                if (!length) {
                  length = remaining;
                } else {
                  length = Number(length);
                  if (length > remaining) {
                    length = remaining;
                  }
                }

                var strLen = string.length;

                if (length > strLen / 2) {
                  length = strLen / 2;
                }
                for (var i = 0; i < length; ++i) {
                  var parsed = parseInt(string.substr(i * 2, 2), 16);
                  if (numberIsNaN(parsed)) return i;
                  buf[offset + i] = parsed;
                }
                return i;
              }

              function utf8Write(buf, string, offset, length) {
                return blitBuffer(
                  utf8ToBytes(string, buf.length - offset),
                  buf,
                  offset,
                  length
                );
              }

              function asciiWrite(buf, string, offset, length) {
                return blitBuffer(asciiToBytes(string), buf, offset, length);
              }

              function latin1Write(buf, string, offset, length) {
                return asciiWrite(buf, string, offset, length);
              }

              function base64Write(buf, string, offset, length) {
                return blitBuffer(base64ToBytes(string), buf, offset, length);
              }

              function ucs2Write(buf, string, offset, length) {
                return blitBuffer(
                  utf16leToBytes(string, buf.length - offset),
                  buf,
                  offset,
                  length
                );
              }

              Buffer.prototype.write = function write(
                string,
                offset,
                length,
                encoding
              ) {
                // Buffer#write(string)
                if (offset === undefined) {
                  encoding = "utf8";
                  length = this.length;
                  offset = 0;
                  // Buffer#write(string, encoding)
                } else if (length === undefined && typeof offset === "string") {
                  encoding = offset;
                  length = this.length;
                  offset = 0;
                  // Buffer#write(string, offset[, length][, encoding])
                } else if (isFinite(offset)) {
                  offset = offset >>> 0;
                  if (isFinite(length)) {
                    length = length >>> 0;
                    if (encoding === undefined) encoding = "utf8";
                  } else {
                    encoding = length;
                    length = undefined;
                  }
                } else {
                  throw new Error(
                    "Buffer.write(string, encoding, offset[, length]) is no longer supported"
                  );
                }

                var remaining = this.length - offset;
                if (length === undefined || length > remaining)
                  length = remaining;

                if (
                  (string.length > 0 && (length < 0 || offset < 0)) ||
                  offset > this.length
                ) {
                  throw new RangeError(
                    "Attempt to write outside buffer bounds"
                  );
                }

                if (!encoding) encoding = "utf8";

                var loweredCase = false;
                for (;;) {
                  switch (encoding) {
                    case "hex":
                      return hexWrite(this, string, offset, length);

                    case "utf8":
                    case "utf-8":
                      return utf8Write(this, string, offset, length);

                    case "ascii":
                      return asciiWrite(this, string, offset, length);

                    case "latin1":
                    case "binary":
                      return latin1Write(this, string, offset, length);

                    case "base64":
                      // Warning: maxLength not taken into account in base64Write
                      return base64Write(this, string, offset, length);

                    case "ucs2":
                    case "ucs-2":
                    case "utf16le":
                    case "utf-16le":
                      return ucs2Write(this, string, offset, length);

                    default:
                      if (loweredCase)
                        throw new TypeError("Unknown encoding: " + encoding);
                      encoding = ("" + encoding).toLowerCase();
                      loweredCase = true;
                  }
                }
              };

              Buffer.prototype.toJSON = function toJSON() {
                return {
                  type: "Buffer",
                  data: Array.prototype.slice.call(this._arr || this, 0),
                };
              };

              function base64Slice(buf, start, end) {
                if (start === 0 && end === buf.length) {
                  return base64.fromByteArray(buf);
                } else {
                  return base64.fromByteArray(buf.slice(start, end));
                }
              }

              function utf8Slice(buf, start, end) {
                end = Math.min(buf.length, end);
                var res = [];

                var i = start;
                while (i < end) {
                  var firstByte = buf[i];
                  var codePoint = null;
                  var bytesPerSequence =
                    firstByte > 0xef
                      ? 4
                      : firstByte > 0xdf
                      ? 3
                      : firstByte > 0xbf
                      ? 2
                      : 1;

                  if (i + bytesPerSequence <= end) {
                    var secondByte, thirdByte, fourthByte, tempCodePoint;

                    switch (bytesPerSequence) {
                      case 1:
                        if (firstByte < 0x80) {
                          codePoint = firstByte;
                        }
                        break;
                      case 2:
                        secondByte = buf[i + 1];
                        if ((secondByte & 0xc0) === 0x80) {
                          tempCodePoint =
                            ((firstByte & 0x1f) << 0x6) | (secondByte & 0x3f);
                          if (tempCodePoint > 0x7f) {
                            codePoint = tempCodePoint;
                          }
                        }
                        break;
                      case 3:
                        secondByte = buf[i + 1];
                        thirdByte = buf[i + 2];
                        if (
                          (secondByte & 0xc0) === 0x80 &&
                          (thirdByte & 0xc0) === 0x80
                        ) {
                          tempCodePoint =
                            ((firstByte & 0xf) << 0xc) |
                            ((secondByte & 0x3f) << 0x6) |
                            (thirdByte & 0x3f);
                          if (
                            tempCodePoint > 0x7ff &&
                            (tempCodePoint < 0xd800 || tempCodePoint > 0xdfff)
                          ) {
                            codePoint = tempCodePoint;
                          }
                        }
                        break;
                      case 4:
                        secondByte = buf[i + 1];
                        thirdByte = buf[i + 2];
                        fourthByte = buf[i + 3];
                        if (
                          (secondByte & 0xc0) === 0x80 &&
                          (thirdByte & 0xc0) === 0x80 &&
                          (fourthByte & 0xc0) === 0x80
                        ) {
                          tempCodePoint =
                            ((firstByte & 0xf) << 0x12) |
                            ((secondByte & 0x3f) << 0xc) |
                            ((thirdByte & 0x3f) << 0x6) |
                            (fourthByte & 0x3f);
                          if (
                            tempCodePoint > 0xffff &&
                            tempCodePoint < 0x110000
                          ) {
                            codePoint = tempCodePoint;
                          }
                        }
                    }
                  }

                  if (codePoint === null) {
                    // we did not generate a valid codePoint so insert a
                    // replacement char (U+FFFD) and advance only 1 byte
                    codePoint = 0xfffd;
                    bytesPerSequence = 1;
                  } else if (codePoint > 0xffff) {
                    // encode to utf16 (surrogate pair dance)
                    codePoint -= 0x10000;
                    res.push(((codePoint >>> 10) & 0x3ff) | 0xd800);
                    codePoint = 0xdc00 | (codePoint & 0x3ff);
                  }

                  res.push(codePoint);
                  i += bytesPerSequence;
                }

                return decodeCodePointsArray(res);
              }

              // Based on http://stackoverflow.com/a/22747272/680742, the browser with
              // the lowest limit is Chrome, with 0x10000 args.
              // We go 1 magnitude less, for safety
              var MAX_ARGUMENTS_LENGTH = 0x1000;

              function decodeCodePointsArray(codePoints) {
                var len = codePoints.length;
                if (len <= MAX_ARGUMENTS_LENGTH) {
                  return String.fromCharCode.apply(String, codePoints); // avoid extra slice()
                }

                // Decode in chunks to avoid "call stack size exceeded".
                var res = "";
                var i = 0;
                while (i < len) {
                  res += String.fromCharCode.apply(
                    String,
                    codePoints.slice(i, (i += MAX_ARGUMENTS_LENGTH))
                  );
                }
                return res;
              }

              function asciiSlice(buf, start, end) {
                var ret = "";
                end = Math.min(buf.length, end);

                for (var i = start; i < end; ++i) {
                  ret += String.fromCharCode(buf[i] & 0x7f);
                }
                return ret;
              }

              function latin1Slice(buf, start, end) {
                var ret = "";
                end = Math.min(buf.length, end);

                for (var i = start; i < end; ++i) {
                  ret += String.fromCharCode(buf[i]);
                }
                return ret;
              }

              function hexSlice(buf, start, end) {
                var len = buf.length;

                if (!start || start < 0) start = 0;
                if (!end || end < 0 || end > len) end = len;

                var out = "";
                for (var i = start; i < end; ++i) {
                  out += toHex(buf[i]);
                }
                return out;
              }

              function utf16leSlice(buf, start, end) {
                var bytes = buf.slice(start, end);
                var res = "";
                for (var i = 0; i < bytes.length; i += 2) {
                  res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
                }
                return res;
              }

              Buffer.prototype.slice = function slice(start, end) {
                var len = this.length;
                start = ~~start;
                end = end === undefined ? len : ~~end;

                if (start < 0) {
                  start += len;
                  if (start < 0) start = 0;
                } else if (start > len) {
                  start = len;
                }

                if (end < 0) {
                  end += len;
                  if (end < 0) end = 0;
                } else if (end > len) {
                  end = len;
                }

                if (end < start) end = start;

                var newBuf = this.subarray(start, end);
                // Return an augmented `Uint8Array` instance
                newBuf.__proto__ = Buffer.prototype;
                return newBuf;
              };

              /*
               * Need to make sure that buffer isn't trying to write out of bounds.
               */
              function checkOffset(offset, ext, length) {
                if (offset % 1 !== 0 || offset < 0)
                  throw new RangeError("offset is not uint");
                if (offset + ext > length)
                  throw new RangeError("Trying to access beyond buffer length");
              }

              Buffer.prototype.readUIntLE = function readUIntLE(
                offset,
                byteLength,
                noAssert
              ) {
                offset = offset >>> 0;
                byteLength = byteLength >>> 0;
                if (!noAssert) checkOffset(offset, byteLength, this.length);

                var val = this[offset];
                var mul = 1;
                var i = 0;
                while (++i < byteLength && (mul *= 0x100)) {
                  val += this[offset + i] * mul;
                }

                return val;
              };

              Buffer.prototype.readUIntBE = function readUIntBE(
                offset,
                byteLength,
                noAssert
              ) {
                offset = offset >>> 0;
                byteLength = byteLength >>> 0;
                if (!noAssert) {
                  checkOffset(offset, byteLength, this.length);
                }

                var val = this[offset + --byteLength];
                var mul = 1;
                while (byteLength > 0 && (mul *= 0x100)) {
                  val += this[offset + --byteLength] * mul;
                }

                return val;
              };

              Buffer.prototype.readUInt8 = function readUInt8(
                offset,
                noAssert
              ) {
                offset = offset >>> 0;
                if (!noAssert) checkOffset(offset, 1, this.length);
                return this[offset];
              };

              Buffer.prototype.readUInt16LE = function readUInt16LE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0;
                if (!noAssert) checkOffset(offset, 2, this.length);
                return this[offset] | (this[offset + 1] << 8);
              };

              Buffer.prototype.readUInt16BE = function readUInt16BE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0;
                if (!noAssert) checkOffset(offset, 2, this.length);
                return (this[offset] << 8) | this[offset + 1];
              };

              Buffer.prototype.readUInt32LE = function readUInt32LE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0;
                if (!noAssert) checkOffset(offset, 4, this.length);

                return (
                  (this[offset] |
                    (this[offset + 1] << 8) |
                    (this[offset + 2] << 16)) +
                  this[offset + 3] * 0x1000000
                );
              };

              Buffer.prototype.readUInt32BE = function readUInt32BE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0;
                if (!noAssert) checkOffset(offset, 4, this.length);

                return (
                  this[offset] * 0x1000000 +
                  ((this[offset + 1] << 16) |
                    (this[offset + 2] << 8) |
                    this[offset + 3])
                );
              };

              Buffer.prototype.readIntLE = function readIntLE(
                offset,
                byteLength,
                noAssert
              ) {
                offset = offset >>> 0;
                byteLength = byteLength >>> 0;
                if (!noAssert) checkOffset(offset, byteLength, this.length);

                var val = this[offset];
                var mul = 1;
                var i = 0;
                while (++i < byteLength && (mul *= 0x100)) {
                  val += this[offset + i] * mul;
                }
                mul *= 0x80;

                if (val >= mul) val -= Math.pow(2, 8 * byteLength);

                return val;
              };

              Buffer.prototype.readIntBE = function readIntBE(
                offset,
                byteLength,
                noAssert
              ) {
                offset = offset >>> 0;
                byteLength = byteLength >>> 0;
                if (!noAssert) checkOffset(offset, byteLength, this.length);

                var i = byteLength;
                var mul = 1;
                var val = this[offset + --i];
                while (i > 0 && (mul *= 0x100)) {
                  val += this[offset + --i] * mul;
                }
                mul *= 0x80;

                if (val >= mul) val -= Math.pow(2, 8 * byteLength);

                return val;
              };

              Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
                offset = offset >>> 0;
                if (!noAssert) checkOffset(offset, 1, this.length);
                if (!(this[offset] & 0x80)) return this[offset];
                return (0xff - this[offset] + 1) * -1;
              };

              Buffer.prototype.readInt16LE = function readInt16LE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0;
                if (!noAssert) checkOffset(offset, 2, this.length);
                var val = this[offset] | (this[offset + 1] << 8);
                return val & 0x8000 ? val | 0xffff0000 : val;
              };

              Buffer.prototype.readInt16BE = function readInt16BE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0;
                if (!noAssert) checkOffset(offset, 2, this.length);
                var val = this[offset + 1] | (this[offset] << 8);
                return val & 0x8000 ? val | 0xffff0000 : val;
              };

              Buffer.prototype.readInt32LE = function readInt32LE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0;
                if (!noAssert) checkOffset(offset, 4, this.length);

                return (
                  this[offset] |
                  (this[offset + 1] << 8) |
                  (this[offset + 2] << 16) |
                  (this[offset + 3] << 24)
                );
              };

              Buffer.prototype.readInt32BE = function readInt32BE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0;
                if (!noAssert) checkOffset(offset, 4, this.length);

                return (
                  (this[offset] << 24) |
                  (this[offset + 1] << 16) |
                  (this[offset + 2] << 8) |
                  this[offset + 3]
                );
              };

              Buffer.prototype.readFloatLE = function readFloatLE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0;
                if (!noAssert) checkOffset(offset, 4, this.length);
                return ieee754.read(this, offset, true, 23, 4);
              };

              Buffer.prototype.readFloatBE = function readFloatBE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0;
                if (!noAssert) checkOffset(offset, 4, this.length);
                return ieee754.read(this, offset, false, 23, 4);
              };

              Buffer.prototype.readDoubleLE = function readDoubleLE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0;
                if (!noAssert) checkOffset(offset, 8, this.length);
                return ieee754.read(this, offset, true, 52, 8);
              };

              Buffer.prototype.readDoubleBE = function readDoubleBE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0;
                if (!noAssert) checkOffset(offset, 8, this.length);
                return ieee754.read(this, offset, false, 52, 8);
              };

              function checkInt(buf, value, offset, ext, max, min) {
                if (!Buffer.isBuffer(buf))
                  throw new TypeError(
                    '"buffer" argument must be a Buffer instance'
                  );
                if (value > max || value < min)
                  throw new RangeError('"value" argument is out of bounds');
                if (offset + ext > buf.length)
                  throw new RangeError("Index out of range");
              }

              Buffer.prototype.writeUIntLE = function writeUIntLE(
                value,
                offset,
                byteLength,
                noAssert
              ) {
                value = +value;
                offset = offset >>> 0;
                byteLength = byteLength >>> 0;
                if (!noAssert) {
                  var maxBytes = Math.pow(2, 8 * byteLength) - 1;
                  checkInt(this, value, offset, byteLength, maxBytes, 0);
                }

                var mul = 1;
                var i = 0;
                this[offset] = value & 0xff;
                while (++i < byteLength && (mul *= 0x100)) {
                  this[offset + i] = (value / mul) & 0xff;
                }

                return offset + byteLength;
              };

              Buffer.prototype.writeUIntBE = function writeUIntBE(
                value,
                offset,
                byteLength,
                noAssert
              ) {
                value = +value;
                offset = offset >>> 0;
                byteLength = byteLength >>> 0;
                if (!noAssert) {
                  var maxBytes = Math.pow(2, 8 * byteLength) - 1;
                  checkInt(this, value, offset, byteLength, maxBytes, 0);
                }

                var i = byteLength - 1;
                var mul = 1;
                this[offset + i] = value & 0xff;
                while (--i >= 0 && (mul *= 0x100)) {
                  this[offset + i] = (value / mul) & 0xff;
                }

                return offset + byteLength;
              };

              Buffer.prototype.writeUInt8 = function writeUInt8(
                value,
                offset,
                noAssert
              ) {
                value = +value;
                offset = offset >>> 0;
                if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
                this[offset] = value & 0xff;
                return offset + 1;
              };

              Buffer.prototype.writeUInt16LE = function writeUInt16LE(
                value,
                offset,
                noAssert
              ) {
                value = +value;
                offset = offset >>> 0;
                if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
                this[offset] = value & 0xff;
                this[offset + 1] = value >>> 8;
                return offset + 2;
              };

              Buffer.prototype.writeUInt16BE = function writeUInt16BE(
                value,
                offset,
                noAssert
              ) {
                value = +value;
                offset = offset >>> 0;
                if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
                this[offset] = value >>> 8;
                this[offset + 1] = value & 0xff;
                return offset + 2;
              };

              Buffer.prototype.writeUInt32LE = function writeUInt32LE(
                value,
                offset,
                noAssert
              ) {
                value = +value;
                offset = offset >>> 0;
                if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
                this[offset + 3] = value >>> 24;
                this[offset + 2] = value >>> 16;
                this[offset + 1] = value >>> 8;
                this[offset] = value & 0xff;
                return offset + 4;
              };

              Buffer.prototype.writeUInt32BE = function writeUInt32BE(
                value,
                offset,
                noAssert
              ) {
                value = +value;
                offset = offset >>> 0;
                if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
                this[offset] = value >>> 24;
                this[offset + 1] = value >>> 16;
                this[offset + 2] = value >>> 8;
                this[offset + 3] = value & 0xff;
                return offset + 4;
              };

              Buffer.prototype.writeIntLE = function writeIntLE(
                value,
                offset,
                byteLength,
                noAssert
              ) {
                value = +value;
                offset = offset >>> 0;
                if (!noAssert) {
                  var limit = Math.pow(2, 8 * byteLength - 1);

                  checkInt(this, value, offset, byteLength, limit - 1, -limit);
                }

                var i = 0;
                var mul = 1;
                var sub = 0;
                this[offset] = value & 0xff;
                while (++i < byteLength && (mul *= 0x100)) {
                  if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
                    sub = 1;
                  }
                  this[offset + i] = (((value / mul) >> 0) - sub) & 0xff;
                }

                return offset + byteLength;
              };

              Buffer.prototype.writeIntBE = function writeIntBE(
                value,
                offset,
                byteLength,
                noAssert
              ) {
                value = +value;
                offset = offset >>> 0;
                if (!noAssert) {
                  var limit = Math.pow(2, 8 * byteLength - 1);

                  checkInt(this, value, offset, byteLength, limit - 1, -limit);
                }

                var i = byteLength - 1;
                var mul = 1;
                var sub = 0;
                this[offset + i] = value & 0xff;
                while (--i >= 0 && (mul *= 0x100)) {
                  if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
                    sub = 1;
                  }
                  this[offset + i] = (((value / mul) >> 0) - sub) & 0xff;
                }

                return offset + byteLength;
              };

              Buffer.prototype.writeInt8 = function writeInt8(
                value,
                offset,
                noAssert
              ) {
                value = +value;
                offset = offset >>> 0;
                if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
                if (value < 0) value = 0xff + value + 1;
                this[offset] = value & 0xff;
                return offset + 1;
              };

              Buffer.prototype.writeInt16LE = function writeInt16LE(
                value,
                offset,
                noAssert
              ) {
                value = +value;
                offset = offset >>> 0;
                if (!noAssert)
                  checkInt(this, value, offset, 2, 0x7fff, -0x8000);
                this[offset] = value & 0xff;
                this[offset + 1] = value >>> 8;
                return offset + 2;
              };

              Buffer.prototype.writeInt16BE = function writeInt16BE(
                value,
                offset,
                noAssert
              ) {
                value = +value;
                offset = offset >>> 0;
                if (!noAssert)
                  checkInt(this, value, offset, 2, 0x7fff, -0x8000);
                this[offset] = value >>> 8;
                this[offset + 1] = value & 0xff;
                return offset + 2;
              };

              Buffer.prototype.writeInt32LE = function writeInt32LE(
                value,
                offset,
                noAssert
              ) {
                value = +value;
                offset = offset >>> 0;
                if (!noAssert)
                  checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
                this[offset] = value & 0xff;
                this[offset + 1] = value >>> 8;
                this[offset + 2] = value >>> 16;
                this[offset + 3] = value >>> 24;
                return offset + 4;
              };

              Buffer.prototype.writeInt32BE = function writeInt32BE(
                value,
                offset,
                noAssert
              ) {
                value = +value;
                offset = offset >>> 0;
                if (!noAssert)
                  checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
                if (value < 0) value = 0xffffffff + value + 1;
                this[offset] = value >>> 24;
                this[offset + 1] = value >>> 16;
                this[offset + 2] = value >>> 8;
                this[offset + 3] = value & 0xff;
                return offset + 4;
              };

              function checkIEEE754(buf, value, offset, ext, max, min) {
                if (offset + ext > buf.length)
                  throw new RangeError("Index out of range");
                if (offset < 0) throw new RangeError("Index out of range");
              }

              function writeFloat(buf, value, offset, littleEndian, noAssert) {
                value = +value;
                offset = offset >>> 0;
                if (!noAssert) {
                  checkIEEE754(
                    buf,
                    value,
                    offset,
                    4,
                    3.4028234663852886e38,
                    -3.4028234663852886e38
                  );
                }
                ieee754.write(buf, value, offset, littleEndian, 23, 4);
                return offset + 4;
              }

              Buffer.prototype.writeFloatLE = function writeFloatLE(
                value,
                offset,
                noAssert
              ) {
                return writeFloat(this, value, offset, true, noAssert);
              };

              Buffer.prototype.writeFloatBE = function writeFloatBE(
                value,
                offset,
                noAssert
              ) {
                return writeFloat(this, value, offset, false, noAssert);
              };

              function writeDouble(buf, value, offset, littleEndian, noAssert) {
                value = +value;
                offset = offset >>> 0;
                if (!noAssert) {
                  checkIEEE754(
                    buf,
                    value,
                    offset,
                    8,
                    1.7976931348623157e308,
                    -1.7976931348623157e308
                  );
                }
                ieee754.write(buf, value, offset, littleEndian, 52, 8);
                return offset + 8;
              }

              Buffer.prototype.writeDoubleLE = function writeDoubleLE(
                value,
                offset,
                noAssert
              ) {
                return writeDouble(this, value, offset, true, noAssert);
              };

              Buffer.prototype.writeDoubleBE = function writeDoubleBE(
                value,
                offset,
                noAssert
              ) {
                return writeDouble(this, value, offset, false, noAssert);
              };

              // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
              Buffer.prototype.copy = function copy(
                target,
                targetStart,
                start,
                end
              ) {
                if (!Buffer.isBuffer(target))
                  throw new TypeError("argument should be a Buffer");
                if (!start) start = 0;
                if (!end && end !== 0) end = this.length;
                if (targetStart >= target.length) targetStart = target.length;
                if (!targetStart) targetStart = 0;
                if (end > 0 && end < start) end = start;

                // Copy 0 bytes; we're done
                if (end === start) return 0;
                if (target.length === 0 || this.length === 0) return 0;

                // Fatal error conditions
                if (targetStart < 0) {
                  throw new RangeError("targetStart out of bounds");
                }
                if (start < 0 || start >= this.length)
                  throw new RangeError("Index out of range");
                if (end < 0) throw new RangeError("sourceEnd out of bounds");

                // Are we oob?
                if (end > this.length) end = this.length;
                if (target.length - targetStart < end - start) {
                  end = target.length - targetStart + start;
                }

                var len = end - start;

                if (
                  this === target &&
                  typeof Uint8Array.prototype.copyWithin === "function"
                ) {
                  // Use built-in when available, missing from IE11
                  this.copyWithin(targetStart, start, end);
                } else if (
                  this === target &&
                  start < targetStart &&
                  targetStart < end
                ) {
                  // descending copy from end
                  for (var i = len - 1; i >= 0; --i) {
                    target[i + targetStart] = this[i + start];
                  }
                } else {
                  Uint8Array.prototype.set.call(
                    target,
                    this.subarray(start, end),
                    targetStart
                  );
                }

                return len;
              };

              // Usage:
              //    buffer.fill(number[, offset[, end]])
              //    buffer.fill(buffer[, offset[, end]])
              //    buffer.fill(string[, offset[, end]][, encoding])
              Buffer.prototype.fill = function fill(val, start, end, encoding) {
                // Handle string cases:
                if (typeof val === "string") {
                  if (typeof start === "string") {
                    encoding = start;
                    start = 0;
                    end = this.length;
                  } else if (typeof end === "string") {
                    encoding = end;
                    end = this.length;
                  }
                  if (encoding !== undefined && typeof encoding !== "string") {
                    throw new TypeError("encoding must be a string");
                  }
                  if (
                    typeof encoding === "string" &&
                    !Buffer.isEncoding(encoding)
                  ) {
                    throw new TypeError("Unknown encoding: " + encoding);
                  }
                  if (val.length === 1) {
                    var code = val.charCodeAt(0);
                    if (
                      (encoding === "utf8" && code < 128) ||
                      encoding === "latin1"
                    ) {
                      // Fast path: If `val` fits into a single byte, use that numeric value.
                      val = code;
                    }
                  }
                } else if (typeof val === "number") {
                  val = val & 255;
                }

                // Invalid ranges are not set to a default, so can range check early.
                if (start < 0 || this.length < start || this.length < end) {
                  throw new RangeError("Out of range index");
                }

                if (end <= start) {
                  return this;
                }

                start = start >>> 0;
                end = end === undefined ? this.length : end >>> 0;

                if (!val) val = 0;

                var i;
                if (typeof val === "number") {
                  for (i = start; i < end; ++i) {
                    this[i] = val;
                  }
                } else {
                  var bytes = Buffer.isBuffer(val)
                    ? val
                    : Buffer.from(val, encoding);
                  var len = bytes.length;
                  if (len === 0) {
                    throw new TypeError(
                      'The value "' + val + '" is invalid for argument "value"'
                    );
                  }
                  for (i = 0; i < end - start; ++i) {
                    this[i + start] = bytes[i % len];
                  }
                }

                return this;
              };

              // HELPER FUNCTIONS
              // ================

              var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

              function base64clean(str) {
                // Node takes equal signs as end of the Base64 encoding
                str = str.split("=")[0];
                // Node strips out invalid characters like \n and \t from the string, base64-js does not
                str = str.trim().replace(INVALID_BASE64_RE, "");
                // Node converts strings with length < 2 to ''
                if (str.length < 2) return "";
                // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
                while (str.length % 4 !== 0) {
                  str = str + "=";
                }
                return str;
              }

              function toHex(n) {
                if (n < 16) return "0" + n.toString(16);
                return n.toString(16);
              }

              function utf8ToBytes(string, units) {
                units = units || Infinity;
                var codePoint;
                var length = string.length;
                var leadSurrogate = null;
                var bytes = [];

                for (var i = 0; i < length; ++i) {
                  codePoint = string.charCodeAt(i);

                  // is surrogate component
                  if (codePoint > 0xd7ff && codePoint < 0xe000) {
                    // last char was a lead
                    if (!leadSurrogate) {
                      // no lead yet
                      if (codePoint > 0xdbff) {
                        // unexpected trail
                        if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd);
                        continue;
                      } else if (i + 1 === length) {
                        // unpaired lead
                        if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd);
                        continue;
                      }

                      // valid lead
                      leadSurrogate = codePoint;

                      continue;
                    }

                    // 2 leads in a row
                    if (codePoint < 0xdc00) {
                      if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd);
                      leadSurrogate = codePoint;
                      continue;
                    }

                    // valid surrogate pair
                    codePoint =
                      (((leadSurrogate - 0xd800) << 10) |
                        (codePoint - 0xdc00)) +
                      0x10000;
                  } else if (leadSurrogate) {
                    // valid bmp char, but last char was a lead
                    if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd);
                  }

                  leadSurrogate = null;

                  // encode utf8
                  if (codePoint < 0x80) {
                    if ((units -= 1) < 0) break;
                    bytes.push(codePoint);
                  } else if (codePoint < 0x800) {
                    if ((units -= 2) < 0) break;
                    bytes.push(
                      (codePoint >> 0x6) | 0xc0,
                      (codePoint & 0x3f) | 0x80
                    );
                  } else if (codePoint < 0x10000) {
                    if ((units -= 3) < 0) break;
                    bytes.push(
                      (codePoint >> 0xc) | 0xe0,
                      ((codePoint >> 0x6) & 0x3f) | 0x80,
                      (codePoint & 0x3f) | 0x80
                    );
                  } else if (codePoint < 0x110000) {
                    if ((units -= 4) < 0) break;
                    bytes.push(
                      (codePoint >> 0x12) | 0xf0,
                      ((codePoint >> 0xc) & 0x3f) | 0x80,
                      ((codePoint >> 0x6) & 0x3f) | 0x80,
                      (codePoint & 0x3f) | 0x80
                    );
                  } else {
                    throw new Error("Invalid code point");
                  }
                }

                return bytes;
              }

              function asciiToBytes(str) {
                var byteArray = [];
                for (var i = 0; i < str.length; ++i) {
                  // Node's code seems to be doing this and not & 0x7F..
                  byteArray.push(str.charCodeAt(i) & 0xff);
                }
                return byteArray;
              }

              function utf16leToBytes(str, units) {
                var c, hi, lo;
                var byteArray = [];
                for (var i = 0; i < str.length; ++i) {
                  if ((units -= 2) < 0) break;

                  c = str.charCodeAt(i);
                  hi = c >> 8;
                  lo = c % 256;
                  byteArray.push(lo);
                  byteArray.push(hi);
                }

                return byteArray;
              }

              function base64ToBytes(str) {
                return base64.toByteArray(base64clean(str));
              }

              function blitBuffer(src, dst, offset, length) {
                for (var i = 0; i < length; ++i) {
                  if (i + offset >= dst.length || i >= src.length) break;
                  dst[i + offset] = src[i];
                }
                return i;
              }

              // ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
              // the `instanceof` check but they should be treated as of that type.
              // See: https://github.com/feross/buffer/issues/166
              function isInstance(obj, type) {
                return (
                  obj instanceof type ||
                  (obj != null &&
                    obj.constructor != null &&
                    obj.constructor.name != null &&
                    obj.constructor.name === type.name)
                );
              }
              function numberIsNaN(obj) {
                // For IE11 support
                return obj !== obj; // eslint-disable-line no-self-compare
              }
            }.call(this));
          }.call(this, require("buffer").Buffer));
        },
        { "base64-js": 1, buffer: 7, ieee754: 13 },
      ],
      8: [
        function (require, module, exports) {
          /**
           * Helpers.
           */

          var s = 1000;
          var m = s * 60;
          var h = m * 60;
          var d = h * 24;
          var w = d * 7;
          var y = d * 365.25;

          /**
           * Parse or format the given `val`.
           *
           * Options:
           *
           *  - `long` verbose formatting [false]
           *
           * @param {String|Number} val
           * @param {Object} [options]
           * @throws {Error} throw an error if val is not a non-empty string or a number
           * @return {String|Number}
           * @api public
           */

          module.exports = function (val, options) {
            options = options || {};
            var type = typeof val;
            if (type === "string" && val.length > 0) {
              return parse(val);
            } else if (type === "number" && isFinite(val)) {
              return options.long ? fmtLong(val) : fmtShort(val);
            }
            throw new Error(
              "val is not a non-empty string or a valid number. val=" +
                JSON.stringify(val)
            );
          };

          /**
           * Parse the given `str` and return milliseconds.
           *
           * @param {String} str
           * @return {Number}
           * @api private
           */

          function parse(str) {
            str = String(str);
            if (str.length > 100) {
              return;
            }
            var match =
              /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
                str
              );
            if (!match) {
              return;
            }
            var n = parseFloat(match[1]);
            var type = (match[2] || "ms").toLowerCase();
            switch (type) {
              case "years":
              case "year":
              case "yrs":
              case "yr":
              case "y":
                return n * y;
              case "weeks":
              case "week":
              case "w":
                return n * w;
              case "days":
              case "day":
              case "d":
                return n * d;
              case "hours":
              case "hour":
              case "hrs":
              case "hr":
              case "h":
                return n * h;
              case "minutes":
              case "minute":
              case "mins":
              case "min":
              case "m":
                return n * m;
              case "seconds":
              case "second":
              case "secs":
              case "sec":
              case "s":
                return n * s;
              case "milliseconds":
              case "millisecond":
              case "msecs":
              case "msec":
              case "ms":
                return n;
              default:
                return undefined;
            }
          }

          /**
           * Short format for `ms`.
           *
           * @param {Number} ms
           * @return {String}
           * @api private
           */

          function fmtShort(ms) {
            var msAbs = Math.abs(ms);
            if (msAbs >= d) {
              return Math.round(ms / d) + "d";
            }
            if (msAbs >= h) {
              return Math.round(ms / h) + "h";
            }
            if (msAbs >= m) {
              return Math.round(ms / m) + "m";
            }
            if (msAbs >= s) {
              return Math.round(ms / s) + "s";
            }
            return ms + "ms";
          }

          /**
           * Long format for `ms`.
           *
           * @param {Number} ms
           * @return {String}
           * @api private
           */

          function fmtLong(ms) {
            var msAbs = Math.abs(ms);
            if (msAbs >= d) {
              return plural(ms, msAbs, d, "day");
            }
            if (msAbs >= h) {
              return plural(ms, msAbs, h, "hour");
            }
            if (msAbs >= m) {
              return plural(ms, msAbs, m, "minute");
            }
            if (msAbs >= s) {
              return plural(ms, msAbs, s, "second");
            }
            return ms + " ms";
          }

          /**
           * Pluralization helper.
           */

          function plural(ms, msAbs, n, name) {
            var isPlural = msAbs >= n * 1.5;
            return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
          }
        },
        {},
      ],
      9: [
        function (require, module, exports) {
          (function (process) {
            (function () {
              /* eslint-env browser */

              /**
               * This is the web browser implementation of `debug()`.
               */

              exports.formatArgs = formatArgs;
              exports.save = save;
              exports.load = load;
              exports.useColors = useColors;
              exports.storage = localstorage();
              exports.destroy = (() => {
                let warned = false;

                return () => {
                  if (!warned) {
                    warned = true;
                    console.warn(
                      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
                    );
                  }
                };
              })();

              /**
               * Colors.
               */

              exports.colors = [
                "#0000CC",
                "#0000FF",
                "#0033CC",
                "#0033FF",
                "#0066CC",
                "#0066FF",
                "#0099CC",
                "#0099FF",
                "#00CC00",
                "#00CC33",
                "#00CC66",
                "#00CC99",
                "#00CCCC",
                "#00CCFF",
                "#3300CC",
                "#3300FF",
                "#3333CC",
                "#3333FF",
                "#3366CC",
                "#3366FF",
                "#3399CC",
                "#3399FF",
                "#33CC00",
                "#33CC33",
                "#33CC66",
                "#33CC99",
                "#33CCCC",
                "#33CCFF",
                "#6600CC",
                "#6600FF",
                "#6633CC",
                "#6633FF",
                "#66CC00",
                "#66CC33",
                "#9900CC",
                "#9900FF",
                "#9933CC",
                "#9933FF",
                "#99CC00",
                "#99CC33",
                "#CC0000",
                "#CC0033",
                "#CC0066",
                "#CC0099",
                "#CC00CC",
                "#CC00FF",
                "#CC3300",
                "#CC3333",
                "#CC3366",
                "#CC3399",
                "#CC33CC",
                "#CC33FF",
                "#CC6600",
                "#CC6633",
                "#CC9900",
                "#CC9933",
                "#CCCC00",
                "#CCCC33",
                "#FF0000",
                "#FF0033",
                "#FF0066",
                "#FF0099",
                "#FF00CC",
                "#FF00FF",
                "#FF3300",
                "#FF3333",
                "#FF3366",
                "#FF3399",
                "#FF33CC",
                "#FF33FF",
                "#FF6600",
                "#FF6633",
                "#FF9900",
                "#FF9933",
                "#FFCC00",
                "#FFCC33",
              ];

              /**
               * Currently only WebKit-based Web Inspectors, Firefox >= v31,
               * and the Firebug extension (any Firefox version) are known
               * to support "%c" CSS customizations.
               *
               * TODO: add a `localStorage` variable to explicitly enable/disable colors
               */

              // eslint-disable-next-line complexity
              function useColors() {
                // NB: In an Electron preload script, document will be defined but not fully
                // initialized. Since we know we're in Chrome, we'll just detect this case
                // explicitly
                if (
                  typeof window !== "undefined" &&
                  window.process &&
                  (window.process.type === "renderer" || window.process.__nwjs)
                ) {
                  return true;
                }

                // Internet Explorer and Edge do not support colors.
                if (
                  typeof navigator !== "undefined" &&
                  navigator.userAgent &&
                  navigator.userAgent
                    .toLowerCase()
                    .match(/(edge|trident)\/(\d+)/)
                ) {
                  return false;
                }

                // Is webkit? http://stackoverflow.com/a/16459606/376773
                // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
                return (
                  (typeof document !== "undefined" &&
                    document.documentElement &&
                    document.documentElement.style &&
                    document.documentElement.style.WebkitAppearance) ||
                  // Is firebug? http://stackoverflow.com/a/398120/376773
                  (typeof window !== "undefined" &&
                    window.console &&
                    (window.console.firebug ||
                      (window.console.exception && window.console.table))) ||
                  // Is firefox >= v31?
                  // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
                  (typeof navigator !== "undefined" &&
                    navigator.userAgent &&
                    navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) &&
                    parseInt(RegExp.$1, 10) >= 31) ||
                  // Double check webkit in userAgent just in case we are in a worker
                  (typeof navigator !== "undefined" &&
                    navigator.userAgent &&
                    navigator.userAgent
                      .toLowerCase()
                      .match(/applewebkit\/(\d+)/))
                );
              }

              /**
               * Colorize log arguments if enabled.
               *
               * @api public
               */

              function formatArgs(args) {
                args[0] =
                  (this.useColors ? "%c" : "") +
                  this.namespace +
                  (this.useColors ? " %c" : " ") +
                  args[0] +
                  (this.useColors ? "%c " : " ") +
                  "+" +
                  module.exports.humanize(this.diff);

                if (!this.useColors) {
                  return;
                }

                const c = "color: " + this.color;
                args.splice(1, 0, c, "color: inherit");

                // The final "%c" is somewhat tricky, because there could be other
                // arguments passed either before or after the %c, so we need to
                // figure out the correct index to insert the CSS into
                let index = 0;
                let lastC = 0;
                args[0].replace(/%[a-zA-Z%]/g, (match) => {
                  if (match === "%%") {
                    return;
                  }
                  index++;
                  if (match === "%c") {
                    // We only are interested in the *last* %c
                    // (the user may have provided their own)
                    lastC = index;
                  }
                });

                args.splice(lastC, 0, c);
              }

              /**
               * Invokes `console.debug()` when available.
               * No-op when `console.debug` is not a "function".
               * If `console.debug` is not available, falls back
               * to `console.log`.
               *
               * @api public
               */
              exports.log = console.debug || console.log || (() => {});

              /**
               * Save `namespaces`.
               *
               * @param {String} namespaces
               * @api private
               */
              function save(namespaces) {
                try {
                  if (namespaces) {
                    exports.storage.setItem("debug", namespaces);
                  } else {
                    exports.storage.removeItem("debug");
                  }
                } catch (error) {
                  // Swallow
                  // XXX (@Qix-) should we be logging these?
                }
              }

              /**
               * Load `namespaces`.
               *
               * @return {String} returns the previously persisted debug modes
               * @api private
               */
              function load() {
                let r;
                try {
                  r = exports.storage.getItem("debug");
                } catch (error) {
                  // Swallow
                  // XXX (@Qix-) should we be logging these?
                }

                // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
                if (!r && typeof process !== "undefined" && "env" in process) {
                  r = process.env.DEBUG;
                }

                return r;
              }

              /**
               * Localstorage attempts to return the localstorage.
               *
               * This is necessary because safari throws
               * when a user disables cookies/localstorage
               * and you attempt to access it.
               *
               * @return {LocalStorage}
               * @api private
               */

              function localstorage() {
                try {
                  // TVMLKit (Apple TV JS Runtime) does not have a window object, just localStorage in the global context
                  // The Browser also has localStorage in the global context.
                  return localStorage;
                } catch (error) {
                  // Swallow
                  // XXX (@Qix-) should we be logging these?
                }
              }

              module.exports = require("./common")(exports);

              const { formatters } = module.exports;

              /**
               * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
               */

              formatters.j = function (v) {
                try {
                  return JSON.stringify(v);
                } catch (error) {
                  return "[UnexpectedJSONParseError]: " + error.message;
                }
              };
            }.call(this));
          }.call(this, require("_process")));
        },
        { "./common": 10, _process: 30 },
      ],
      10: [
        function (require, module, exports) {
          /**
           * This is the common logic for both the Node.js and web browser
           * implementations of `debug()`.
           */

          function setup(env) {
            createDebug.debug = createDebug;
            createDebug.default = createDebug;
            createDebug.coerce = coerce;
            createDebug.disable = disable;
            createDebug.enable = enable;
            createDebug.enabled = enabled;
            createDebug.humanize = require("ms");
            createDebug.destroy = destroy;

            Object.keys(env).forEach((key) => {
              createDebug[key] = env[key];
            });

            /**
             * The currently active debug mode names, and names to skip.
             */

            createDebug.names = [];
            createDebug.skips = [];

            /**
             * Map of special "%n" handling functions, for the debug "format" argument.
             *
             * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
             */
            createDebug.formatters = {};

            /**
             * Selects a color for a debug namespace
             * @param {String} namespace The namespace string for the debug instance to be colored
             * @return {Number|String} An ANSI color code for the given namespace
             * @api private
             */
            function selectColor(namespace) {
              let hash = 0;

              for (let i = 0; i < namespace.length; i++) {
                hash = (hash << 5) - hash + namespace.charCodeAt(i);
                hash |= 0; // Convert to 32bit integer
              }

              return createDebug.colors[
                Math.abs(hash) % createDebug.colors.length
              ];
            }
            createDebug.selectColor = selectColor;

            /**
             * Create a debugger with the given `namespace`.
             *
             * @param {String} namespace
             * @return {Function}
             * @api public
             */
            function createDebug(namespace) {
              let prevTime;
              let enableOverride = null;
              let namespacesCache;
              let enabledCache;

              function debug(...args) {
                // Disabled?
                if (!debug.enabled) {
                  return;
                }

                const self = debug;

                // Set `diff` timestamp
                const curr = Number(new Date());
                const ms = curr - (prevTime || curr);
                self.diff = ms;
                self.prev = prevTime;
                self.curr = curr;
                prevTime = curr;

                args[0] = createDebug.coerce(args[0]);

                if (typeof args[0] !== "string") {
                  // Anything else let's inspect with %O
                  args.unshift("%O");
                }

                // Apply any `formatters` transformations
                let index = 0;
                args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
                  // If we encounter an escaped % then don't increase the array index
                  if (match === "%%") {
                    return "%";
                  }
                  index++;
                  const formatter = createDebug.formatters[format];
                  if (typeof formatter === "function") {
                    const val = args[index];
                    match = formatter.call(self, val);

                    // Now we need to remove `args[index]` since it's inlined in the `format`
                    args.splice(index, 1);
                    index--;
                  }
                  return match;
                });

                // Apply env-specific formatting (colors, etc.)
                createDebug.formatArgs.call(self, args);

                const logFn = self.log || createDebug.log;
                logFn.apply(self, args);
              }

              debug.namespace = namespace;
              debug.useColors = createDebug.useColors();
              debug.color = createDebug.selectColor(namespace);
              debug.extend = extend;
              debug.destroy = createDebug.destroy; // XXX Temporary. Will be removed in the next major release.

              Object.defineProperty(debug, "enabled", {
                enumerable: true,
                configurable: false,
                get: () => {
                  if (enableOverride !== null) {
                    return enableOverride;
                  }
                  if (namespacesCache !== createDebug.namespaces) {
                    namespacesCache = createDebug.namespaces;
                    enabledCache = createDebug.enabled(namespace);
                  }

                  return enabledCache;
                },
                set: (v) => {
                  enableOverride = v;
                },
              });

              // Env-specific initialization logic for debug instances
              if (typeof createDebug.init === "function") {
                createDebug.init(debug);
              }

              return debug;
            }

            function extend(namespace, delimiter) {
              const newDebug = createDebug(
                this.namespace +
                  (typeof delimiter === "undefined" ? ":" : delimiter) +
                  namespace
              );
              newDebug.log = this.log;
              return newDebug;
            }

            /**
             * Enables a debug mode by namespaces. This can include modes
             * separated by a colon and wildcards.
             *
             * @param {String} namespaces
             * @api public
             */
            function enable(namespaces) {
              createDebug.save(namespaces);
              createDebug.namespaces = namespaces;

              createDebug.names = [];
              createDebug.skips = [];

              let i;
              const split = (
                typeof namespaces === "string" ? namespaces : ""
              ).split(/[\s,]+/);
              const len = split.length;

              for (i = 0; i < len; i++) {
                if (!split[i]) {
                  // ignore empty strings
                  continue;
                }

                namespaces = split[i].replace(/\*/g, ".*?");

                if (namespaces[0] === "-") {
                  createDebug.skips.push(
                    new RegExp("^" + namespaces.slice(1) + "$")
                  );
                } else {
                  createDebug.names.push(new RegExp("^" + namespaces + "$"));
                }
              }
            }

            /**
             * Disable debug output.
             *
             * @return {String} namespaces
             * @api public
             */
            function disable() {
              const namespaces = [
                ...createDebug.names.map(toNamespace),
                ...createDebug.skips
                  .map(toNamespace)
                  .map((namespace) => "-" + namespace),
              ].join(",");
              createDebug.enable("");
              return namespaces;
            }

            /**
             * Returns true if the given mode name is enabled, false otherwise.
             *
             * @param {String} name
             * @return {Boolean}
             * @api public
             */
            function enabled(name) {
              if (name[name.length - 1] === "*") {
                return true;
              }

              let i;
              let len;

              for (i = 0, len = createDebug.skips.length; i < len; i++) {
                if (createDebug.skips[i].test(name)) {
                  return false;
                }
              }

              for (i = 0, len = createDebug.names.length; i < len; i++) {
                if (createDebug.names[i].test(name)) {
                  return true;
                }
              }

              return false;
            }

            /**
             * Convert regexp to namespace
             *
             * @param {RegExp} regxep
             * @return {String} namespace
             * @api private
             */
            function toNamespace(regexp) {
              return regexp
                .toString()
                .substring(2, regexp.toString().length - 2)
                .replace(/\.\*\?$/, "*");
            }

            /**
             * Coerce `val`.
             *
             * @param {Mixed} val
             * @return {Mixed}
             * @api private
             */
            function coerce(val) {
              if (val instanceof Error) {
                return val.stack || val.message;
              }
              return val;
            }

            /**
             * XXX DO NOT USE. This is a temporary stub function.
             * XXX It WILL be removed in the next major release.
             */
            function destroy() {
              console.warn(
                "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
              );
            }

            createDebug.enable(createDebug.load());

            return createDebug;
          }

          module.exports = setup;
        },
        { ms: 8 },
      ],
      11: [
        function (require, module, exports) {
          (function (process) {
            (function () {
              var once = require("once");

              var noop = function () {};

              var isRequest = function (stream) {
                return stream.setHeader && typeof stream.abort === "function";
              };

              var isChildProcess = function (stream) {
                return (
                  stream.stdio &&
                  Array.isArray(stream.stdio) &&
                  stream.stdio.length === 3
                );
              };

              var eos = function (stream, opts, callback) {
                if (typeof opts === "function") return eos(stream, null, opts);
                if (!opts) opts = {};

                callback = once(callback || noop);

                var ws = stream._writableState;
                var rs = stream._readableState;
                var readable =
                  opts.readable || (opts.readable !== false && stream.readable);
                var writable =
                  opts.writable || (opts.writable !== false && stream.writable);
                var cancelled = false;

                var onlegacyfinish = function () {
                  if (!stream.writable) onfinish();
                };

                var onfinish = function () {
                  writable = false;
                  if (!readable) callback.call(stream);
                };

                var onend = function () {
                  readable = false;
                  if (!writable) callback.call(stream);
                };

                var onexit = function (exitCode) {
                  callback.call(
                    stream,
                    exitCode
                      ? new Error("exited with error code: " + exitCode)
                      : null
                  );
                };

                var onerror = function (err) {
                  callback.call(stream, err);
                };

                var onclose = function () {
                  process.nextTick(onclosenexttick);
                };

                var onclosenexttick = function () {
                  if (cancelled) return;
                  if (readable && !(rs && rs.ended && !rs.destroyed))
                    return callback.call(stream, new Error("premature close"));
                  if (writable && !(ws && ws.ended && !ws.destroyed))
                    return callback.call(stream, new Error("premature close"));
                };

                var onrequest = function () {
                  stream.req.on("finish", onfinish);
                };

                if (isRequest(stream)) {
                  stream.on("complete", onfinish);
                  stream.on("abort", onclose);
                  if (stream.req) onrequest();
                  else stream.on("request", onrequest);
                } else if (writable && !ws) {
                  // legacy streams
                  stream.on("end", onlegacyfinish);
                  stream.on("close", onlegacyfinish);
                }

                if (isChildProcess(stream)) stream.on("exit", onexit);

                stream.on("end", onend);
                stream.on("finish", onfinish);
                if (opts.error !== false) stream.on("error", onerror);
                stream.on("close", onclose);

                return function () {
                  cancelled = true;
                  stream.removeListener("complete", onfinish);
                  stream.removeListener("abort", onclose);
                  stream.removeListener("request", onrequest);
                  if (stream.req) stream.req.removeListener("finish", onfinish);
                  stream.removeListener("end", onlegacyfinish);
                  stream.removeListener("close", onlegacyfinish);
                  stream.removeListener("finish", onfinish);
                  stream.removeListener("exit", onexit);
                  stream.removeListener("end", onend);
                  stream.removeListener("error", onerror);
                  stream.removeListener("close", onclose);
                };
              };

              module.exports = eos;
            }.call(this));
          }.call(this, require("_process")));
        },
        { _process: 30, once: 28 },
      ],
      12: [
        function (require, module, exports) {
          // Copyright Joyent, Inc. and other Node contributors.
          //
          // Permission is hereby granted, free of charge, to any person obtaining a
          // copy of this software and associated documentation files (the
          // "Software"), to deal in the Software without restriction, including
          // without limitation the rights to use, copy, modify, merge, publish,
          // distribute, sublicense, and/or sell copies of the Software, and to permit
          // persons to whom the Software is furnished to do so, subject to the
          // following conditions:
          //
          // The above copyright notice and this permission notice shall be included
          // in all copies or substantial portions of the Software.
          //
          // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
          // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
          // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
          // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
          // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
          // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
          // USE OR OTHER DEALINGS IN THE SOFTWARE.

          "use strict";

          var R = typeof Reflect === "object" ? Reflect : null;
          var ReflectApply =
            R && typeof R.apply === "function"
              ? R.apply
              : function ReflectApply(target, receiver, args) {
                  return Function.prototype.apply.call(target, receiver, args);
                };

          var ReflectOwnKeys;
          if (R && typeof R.ownKeys === "function") {
            ReflectOwnKeys = R.ownKeys;
          } else if (Object.getOwnPropertySymbols) {
            ReflectOwnKeys = function ReflectOwnKeys(target) {
              return Object.getOwnPropertyNames(target).concat(
                Object.getOwnPropertySymbols(target)
              );
            };
          } else {
            ReflectOwnKeys = function ReflectOwnKeys(target) {
              return Object.getOwnPropertyNames(target);
            };
          }

          function ProcessEmitWarning(warning) {
            if (console && console.warn) console.warn(warning);
          }

          var NumberIsNaN =
            Number.isNaN ||
            function NumberIsNaN(value) {
              return value !== value;
            };

          function EventEmitter() {
            EventEmitter.init.call(this);
          }
          module.exports = EventEmitter;
          module.exports.once = once;

          // Backwards-compat with node 0.10.x
          EventEmitter.EventEmitter = EventEmitter;

          EventEmitter.prototype._events = undefined;
          EventEmitter.prototype._eventsCount = 0;
          EventEmitter.prototype._maxListeners = undefined;

          // By default EventEmitters will print a warning if more than 10 listeners are
          // added to it. This is a useful default which helps finding memory leaks.
          var defaultMaxListeners = 10;

          function checkListener(listener) {
            if (typeof listener !== "function") {
              throw new TypeError(
                'The "listener" argument must be of type Function. Received type ' +
                  typeof listener
              );
            }
          }

          Object.defineProperty(EventEmitter, "defaultMaxListeners", {
            enumerable: true,
            get: function () {
              return defaultMaxListeners;
            },
            set: function (arg) {
              if (typeof arg !== "number" || arg < 0 || NumberIsNaN(arg)) {
                throw new RangeError(
                  'The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' +
                    arg +
                    "."
                );
              }
              defaultMaxListeners = arg;
            },
          });

          EventEmitter.init = function () {
            if (
              this._events === undefined ||
              this._events === Object.getPrototypeOf(this)._events
            ) {
              this._events = Object.create(null);
              this._eventsCount = 0;
            }

            this._maxListeners = this._maxListeners || undefined;
          };

          // Obviously not all Emitters should be limited to 10. This function allows
          // that to be increased. Set to zero for unlimited.
          EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
            if (typeof n !== "number" || n < 0 || NumberIsNaN(n)) {
              throw new RangeError(
                'The value of "n" is out of range. It must be a non-negative number. Received ' +
                  n +
                  "."
              );
            }
            this._maxListeners = n;
            return this;
          };

          function _getMaxListeners(that) {
            if (that._maxListeners === undefined)
              return EventEmitter.defaultMaxListeners;
            return that._maxListeners;
          }

          EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
            return _getMaxListeners(this);
          };

          EventEmitter.prototype.emit = function emit(type) {
            var args = [];
            for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
            var doError = type === "error";

            var events = this._events;
            if (events !== undefined)
              doError = doError && events.error === undefined;
            else if (!doError) return false;

            // If there is no 'error' event listener then throw.
            if (doError) {
              var er;
              if (args.length > 0) er = args[0];
              if (er instanceof Error) {
                // Note: The comments on the `throw` lines are intentional, they show
                // up in Node's output if this results in an unhandled exception.
                throw er; // Unhandled 'error' event
              }
              // At least give some kind of context to the user
              var err = new Error(
                "Unhandled error." + (er ? " (" + er.message + ")" : "")
              );
              err.context = er;
              throw err; // Unhandled 'error' event
            }

            var handler = events[type];

            if (handler === undefined) return false;

            if (typeof handler === "function") {
              ReflectApply(handler, this, args);
            } else {
              var len = handler.length;
              var listeners = arrayClone(handler, len);
              for (var i = 0; i < len; ++i)
                ReflectApply(listeners[i], this, args);
            }

            return true;
          };

          function _addListener(target, type, listener, prepend) {
            var m;
            var events;
            var existing;

            checkListener(listener);

            events = target._events;
            if (events === undefined) {
              events = target._events = Object.create(null);
              target._eventsCount = 0;
            } else {
              // To avoid recursion in the case that type === "newListener"! Before
              // adding it to the listeners, first emit "newListener".
              if (events.newListener !== undefined) {
                target.emit(
                  "newListener",
                  type,
                  listener.listener ? listener.listener : listener
                );

                // Re-assign `events` because a newListener handler could have caused the
                // this._events to be assigned to a new object
                events = target._events;
              }
              existing = events[type];
            }

            if (existing === undefined) {
              // Optimize the case of one listener. Don't need the extra array object.
              existing = events[type] = listener;
              ++target._eventsCount;
            } else {
              if (typeof existing === "function") {
                // Adding the second element, need to change to array.
                existing = events[type] = prepend
                  ? [listener, existing]
                  : [existing, listener];
                // If we've already got an array, just append.
              } else if (prepend) {
                existing.unshift(listener);
              } else {
                existing.push(listener);
              }

              // Check for listener leak
              m = _getMaxListeners(target);
              if (m > 0 && existing.length > m && !existing.warned) {
                existing.warned = true;
                // No error code for this since it is a Warning
                // eslint-disable-next-line no-restricted-syntax
                var w = new Error(
                  "Possible EventEmitter memory leak detected. " +
                    existing.length +
                    " " +
                    String(type) +
                    " listeners " +
                    "added. Use emitter.setMaxListeners() to " +
                    "increase limit"
                );
                w.name = "MaxListenersExceededWarning";
                w.emitter = target;
                w.type = type;
                w.count = existing.length;
                ProcessEmitWarning(w);
              }
            }

            return target;
          }

          EventEmitter.prototype.addListener = function addListener(
            type,
            listener
          ) {
            return _addListener(this, type, listener, false);
          };

          EventEmitter.prototype.on = EventEmitter.prototype.addListener;

          EventEmitter.prototype.prependListener = function prependListener(
            type,
            listener
          ) {
            return _addListener(this, type, listener, true);
          };

          function onceWrapper() {
            if (!this.fired) {
              this.target.removeListener(this.type, this.wrapFn);
              this.fired = true;
              if (arguments.length === 0)
                return this.listener.call(this.target);
              return this.listener.apply(this.target, arguments);
            }
          }

          function _onceWrap(target, type, listener) {
            var state = {
              fired: false,
              wrapFn: undefined,
              target: target,
              type: type,
              listener: listener,
            };
            var wrapped = onceWrapper.bind(state);
            wrapped.listener = listener;
            state.wrapFn = wrapped;
            return wrapped;
          }

          EventEmitter.prototype.once = function once(type, listener) {
            checkListener(listener);
            this.on(type, _onceWrap(this, type, listener));
            return this;
          };

          EventEmitter.prototype.prependOnceListener =
            function prependOnceListener(type, listener) {
              checkListener(listener);
              this.prependListener(type, _onceWrap(this, type, listener));
              return this;
            };

          // Emits a 'removeListener' event if and only if the listener was removed.
          EventEmitter.prototype.removeListener = function removeListener(
            type,
            listener
          ) {
            var list, events, position, i, originalListener;

            checkListener(listener);

            events = this._events;
            if (events === undefined) return this;

            list = events[type];
            if (list === undefined) return this;

            if (list === listener || list.listener === listener) {
              if (--this._eventsCount === 0) this._events = Object.create(null);
              else {
                delete events[type];
                if (events.removeListener)
                  this.emit("removeListener", type, list.listener || listener);
              }
            } else if (typeof list !== "function") {
              position = -1;

              for (i = list.length - 1; i >= 0; i--) {
                if (list[i] === listener || list[i].listener === listener) {
                  originalListener = list[i].listener;
                  position = i;
                  break;
                }
              }

              if (position < 0) return this;

              if (position === 0) list.shift();
              else {
                spliceOne(list, position);
              }

              if (list.length === 1) events[type] = list[0];

              if (events.removeListener !== undefined)
                this.emit("removeListener", type, originalListener || listener);
            }

            return this;
          };

          EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

          EventEmitter.prototype.removeAllListeners =
            function removeAllListeners(type) {
              var listeners, events, i;

              events = this._events;
              if (events === undefined) return this;

              // not listening for removeListener, no need to emit
              if (events.removeListener === undefined) {
                if (arguments.length === 0) {
                  this._events = Object.create(null);
                  this._eventsCount = 0;
                } else if (events[type] !== undefined) {
                  if (--this._eventsCount === 0)
                    this._events = Object.create(null);
                  else delete events[type];
                }
                return this;
              }

              // emit removeListener for all listeners on all events
              if (arguments.length === 0) {
                var keys = Object.keys(events);
                var key;
                for (i = 0; i < keys.length; ++i) {
                  key = keys[i];
                  if (key === "removeListener") continue;
                  this.removeAllListeners(key);
                }
                this.removeAllListeners("removeListener");
                this._events = Object.create(null);
                this._eventsCount = 0;
                return this;
              }

              listeners = events[type];

              if (typeof listeners === "function") {
                this.removeListener(type, listeners);
              } else if (listeners !== undefined) {
                // LIFO order
                for (i = listeners.length - 1; i >= 0; i--) {
                  this.removeListener(type, listeners[i]);
                }
              }

              return this;
            };

          function _listeners(target, type, unwrap) {
            var events = target._events;

            if (events === undefined) return [];

            var evlistener = events[type];
            if (evlistener === undefined) return [];

            if (typeof evlistener === "function")
              return unwrap
                ? [evlistener.listener || evlistener]
                : [evlistener];

            return unwrap
              ? unwrapListeners(evlistener)
              : arrayClone(evlistener, evlistener.length);
          }

          EventEmitter.prototype.listeners = function listeners(type) {
            return _listeners(this, type, true);
          };

          EventEmitter.prototype.rawListeners = function rawListeners(type) {
            return _listeners(this, type, false);
          };

          EventEmitter.listenerCount = function (emitter, type) {
            if (typeof emitter.listenerCount === "function") {
              return emitter.listenerCount(type);
            } else {
              return listenerCount.call(emitter, type);
            }
          };

          EventEmitter.prototype.listenerCount = listenerCount;
          function listenerCount(type) {
            var events = this._events;

            if (events !== undefined) {
              var evlistener = events[type];

              if (typeof evlistener === "function") {
                return 1;
              } else if (evlistener !== undefined) {
                return evlistener.length;
              }
            }

            return 0;
          }

          EventEmitter.prototype.eventNames = function eventNames() {
            return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
          };

          function arrayClone(arr, n) {
            var copy = new Array(n);
            for (var i = 0; i < n; ++i) copy[i] = arr[i];
            return copy;
          }

          function spliceOne(list, index) {
            for (; index + 1 < list.length; index++)
              list[index] = list[index + 1];
            list.pop();
          }

          function unwrapListeners(arr) {
            var ret = new Array(arr.length);
            for (var i = 0; i < ret.length; ++i) {
              ret[i] = arr[i].listener || arr[i];
            }
            return ret;
          }

          function once(emitter, name) {
            return new Promise(function (resolve, reject) {
              function errorListener(err) {
                emitter.removeListener(name, resolver);
                reject(err);
              }

              function resolver() {
                if (typeof emitter.removeListener === "function") {
                  emitter.removeListener("error", errorListener);
                }
                resolve([].slice.call(arguments));
              }

              eventTargetAgnosticAddListener(emitter, name, resolver, {
                once: true,
              });
              if (name !== "error") {
                addErrorHandlerIfEventEmitter(emitter, errorListener, {
                  once: true,
                });
              }
            });
          }

          function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
            if (typeof emitter.on === "function") {
              eventTargetAgnosticAddListener(emitter, "error", handler, flags);
            }
          }

          function eventTargetAgnosticAddListener(
            emitter,
            name,
            listener,
            flags
          ) {
            if (typeof emitter.on === "function") {
              if (flags.once) {
                emitter.once(name, listener);
              } else {
                emitter.on(name, listener);
              }
            } else if (typeof emitter.addEventListener === "function") {
              // EventTarget does not have `error` event semantics like Node
              // EventEmitters, we do not listen for `error` events here.
              emitter.addEventListener(name, function wrapListener(arg) {
                // IE does not have builtin `{ once: true }` support so we
                // have to do it manually.
                if (flags.once) {
                  emitter.removeEventListener(name, wrapListener);
                }
                listener(arg);
              });
            } else {
              throw new TypeError(
                'The "emitter" argument must be of type EventEmitter. Received type ' +
                  typeof emitter
              );
            }
          }
        },
        {},
      ],
      13: [
        function (require, module, exports) {
          /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
          exports.read = function (buffer, offset, isLE, mLen, nBytes) {
            var e, m;
            var eLen = nBytes * 8 - mLen - 1;
            var eMax = (1 << eLen) - 1;
            var eBias = eMax >> 1;
            var nBits = -7;
            var i = isLE ? nBytes - 1 : 0;
            var d = isLE ? -1 : 1;
            var s = buffer[offset + i];

            i += d;

            e = s & ((1 << -nBits) - 1);
            s >>= -nBits;
            nBits += eLen;
            for (
              ;
              nBits > 0;
              e = e * 256 + buffer[offset + i], i += d, nBits -= 8
            ) {}

            m = e & ((1 << -nBits) - 1);
            e >>= -nBits;
            nBits += mLen;
            for (
              ;
              nBits > 0;
              m = m * 256 + buffer[offset + i], i += d, nBits -= 8
            ) {}

            if (e === 0) {
              e = 1 - eBias;
            } else if (e === eMax) {
              return m ? NaN : (s ? -1 : 1) * Infinity;
            } else {
              m = m + Math.pow(2, mLen);
              e = e - eBias;
            }
            return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
          };

          exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
            var e, m, c;
            var eLen = nBytes * 8 - mLen - 1;
            var eMax = (1 << eLen) - 1;
            var eBias = eMax >> 1;
            var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
            var i = isLE ? 0 : nBytes - 1;
            var d = isLE ? 1 : -1;
            var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

            value = Math.abs(value);

            if (isNaN(value) || value === Infinity) {
              m = isNaN(value) ? 1 : 0;
              e = eMax;
            } else {
              e = Math.floor(Math.log(value) / Math.LN2);
              if (value * (c = Math.pow(2, -e)) < 1) {
                e--;
                c *= 2;
              }
              if (e + eBias >= 1) {
                value += rt / c;
              } else {
                value += rt * Math.pow(2, 1 - eBias);
              }
              if (value * c >= 2) {
                e++;
                c /= 2;
              }

              if (e + eBias >= eMax) {
                m = 0;
                e = eMax;
              } else if (e + eBias >= 1) {
                m = (value * c - 1) * Math.pow(2, mLen);
                e = e + eBias;
              } else {
                m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
                e = 0;
              }
            }

            for (
              ;
              mLen >= 8;
              buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8
            ) {}

            e = (e << mLen) | m;
            eLen += mLen;
            for (
              ;
              eLen > 0;
              buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8
            ) {}

            buffer[offset + i - d] |= s * 128;
          };
        },
        {},
      ],
      14: [
        function (require, module, exports) {
          if (typeof Object.create === "function") {
            // implementation from standard node.js 'util' module
            module.exports = function inherits(ctor, superCtor) {
              if (superCtor) {
                ctor.super_ = superCtor;
                ctor.prototype = Object.create(superCtor.prototype, {
                  constructor: {
                    value: ctor,
                    enumerable: false,
                    writable: true,
                    configurable: true,
                  },
                });
              }
            };
          } else {
            // old school shim for old browsers
            module.exports = function inherits(ctor, superCtor) {
              if (superCtor) {
                ctor.super_ = superCtor;
                var TempCtor = function () {};
                TempCtor.prototype = superCtor.prototype;
                ctor.prototype = new TempCtor();
                ctor.prototype.constructor = ctor;
              }
            };
          }
        },
        {},
      ],
      15: [
        function (require, module, exports) {
          /* (c) 2016 Ari Porad (@ariporad) <http://ariporad.com>. License: ariporad.mit-license.org */

          // Partially from http://stackoverflow.com/a/94049/1928484, and from another SO answer, which told me that the highest
          // char code that's ascii is 127, but I can't find the link for. Sorry.

          var MAX_ASCII_CHAR_CODE = 127;

          module.exports = function isAscii(str) {
            for (var i = 0, strLen = str.length; i < strLen; ++i) {
              if (str.charCodeAt(i) > MAX_ASCII_CHAR_CODE) return false;
            }
            return true;
          };
        },
        {},
      ],
      16: [
        function (require, module, exports) {
          /*! mediasource. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
          module.exports = MediaElementWrapper;

          var inherits = require("inherits");
          var stream = require("readable-stream");
          var toArrayBuffer = require("to-arraybuffer");

          var MediaSource = typeof window !== "undefined" && window.MediaSource;

          var DEFAULT_BUFFER_DURATION = 60; // seconds

          function MediaElementWrapper(elem, opts) {
            var self = this;
            if (!(self instanceof MediaElementWrapper))
              return new MediaElementWrapper(elem, opts);

            if (!MediaSource)
              throw new Error("web browser lacks MediaSource support");

            if (!opts) opts = {};
            self._debug = opts.debug;
            self._bufferDuration =
              opts.bufferDuration || DEFAULT_BUFFER_DURATION;
            self._elem = elem;
            self._mediaSource = new MediaSource();
            self._streams = [];
            self.detailedError = null;

            self._errorHandler = function (error) {
              console.log("self._errorHandler", error);
              self._elem.removeEventListener("error", self._errorHandler);
              var streams = self._streams.slice();
              streams.forEach(function (stream) {
                stream.destroy(self._elem.error);
              });
            };
            self._elem.addEventListener("error", self._errorHandler);

            self._elem.src = window.URL.createObjectURL(self._mediaSource);
          }

          /*
           * `obj` can be a previous value returned by this function
           * or a string
           */
          MediaElementWrapper.prototype.createWriteStream = function (obj) {
            var self = this;

            return new MediaSourceStream(self, obj);
          };

          /*
           * Use to trigger an error on the underlying media element
           */
          MediaElementWrapper.prototype.error = function (err) {
            var self = this;

            // be careful not to overwrite any existing detailedError values
            if (!self.detailedError) {
              self.detailedError = err;
            }
            self._dumpDebugData();
            try {
              self._mediaSource.endOfStream("decode");
            } catch (err) {}

            try {
              // Attempt to clean up object URL
              window.URL.revokeObjectURL(self._elem.src);
            } catch (err) {}
          };

          /*
           * When self._debug is set, dump all data to files
           */
          MediaElementWrapper.prototype._dumpDebugData = function () {
            var self = this;

            if (self._debug) {
              self._debug = false; // prevent multiple dumps on multiple errors
              self._streams.forEach(function (stream, i) {
                downloadBuffers(
                  stream._debugBuffers,
                  "mediasource-stream-" + i
                );
              });
            }
          };

          inherits(MediaSourceStream, stream.Writable);

          function MediaSourceStream(wrapper, obj) {
            var self = this;
            stream.Writable.call(self);

            self._wrapper = wrapper;
            self._elem = wrapper._elem;
            self._mediaSource = wrapper._mediaSource;
            self._allStreams = wrapper._streams;
            self._allStreams.push(self);
            self._bufferDuration = wrapper._bufferDuration;
            self._sourceBuffer = null;
            self._debugBuffers = [];

            self._openHandler = function () {
              self._onSourceOpen();
            };
            self._flowHandler = function () {
              self._flow();
            };
            self._errorHandler = function (err) {
              if (!self.destroyed) {
                self.emit("error", err);
              }
            };

            if (typeof obj === "string") {
              self._type = obj;
              // Need to create a new sourceBuffer
              if (self._mediaSource.readyState === "open") {
                self._createSourceBuffer();
              } else {
                self._mediaSource.addEventListener(
                  "sourceopen",
                  self._openHandler
                );
              }
            } else if (obj._sourceBuffer === null) {
              obj.destroy();
              self._type = obj._type; // The old stream was created but hasn't finished initializing
              self._mediaSource.addEventListener(
                "sourceopen",
                self._openHandler
              );
            } else if (obj._sourceBuffer) {
              obj.destroy();
              self._type = obj._type;
              self._sourceBuffer = obj._sourceBuffer; // Copy over the old sourceBuffer
              self._debugBuffers = obj._debugBuffers; // Copy over previous debug data
              self._sourceBuffer.addEventListener(
                "updateend",
                self._flowHandler
              );
              self._sourceBuffer.addEventListener("error", self._errorHandler);
            } else {
              throw new Error(
                "The argument to MediaElementWrapper.createWriteStream must be a string or a previous stream returned from that function"
              );
            }

            self._elem.addEventListener("timeupdate", self._flowHandler);

            self.on("error", function (err) {
              self._wrapper.error(err);
            });

            self.on("finish", function () {
              if (self.destroyed) return;
              self._finished = true;
              if (
                self._allStreams.every(function (other) {
                  return other._finished;
                })
              ) {
                self._wrapper._dumpDebugData();
                try {
                  self._mediaSource.endOfStream();
                } catch (err) {}
              }
            });
          }

          MediaSourceStream.prototype._onSourceOpen = function () {
            var self = this;
            if (self.destroyed) return;

            self._mediaSource.removeEventListener(
              "sourceopen",
              self._openHandler
            );
            self._createSourceBuffer();
          };

          MediaSourceStream.prototype.destroy = function (err) {
            var self = this;
            if (self.destroyed) return;
            self.destroyed = true;

            // Remove from allStreams
            self._allStreams.splice(self._allStreams.indexOf(self), 1);

            self._mediaSource.removeEventListener(
              "sourceopen",
              self._openHandler
            );
            self._elem.removeEventListener("timeupdate", self._flowHandler);
            if (self._sourceBuffer) {
              self._sourceBuffer.removeEventListener(
                "updateend",
                self._flowHandler
              );
              self._sourceBuffer.removeEventListener(
                "error",
                self._errorHandler
              );
              if (self._mediaSource.readyState === "open") {
                self._sourceBuffer.abort();
              }
            }

            if (err) self.emit("error", err);
            self.emit("close");
          };

          MediaSourceStream.prototype._createSourceBuffer = function () {
            var self = this;
            if (self.destroyed) return;

            if (MediaSource.isTypeSupported(self._type)) {
              self._sourceBuffer = self._mediaSource.addSourceBuffer(
                self._type
              );
              self._sourceBuffer.addEventListener(
                "updateend",
                self._flowHandler
              );
              self._sourceBuffer.addEventListener("error", self._errorHandler);
              if (self._cb) {
                var cb = self._cb;
                self._cb = null;
                cb();
              }
            } else {
              self.destroy(new Error("The provided type is not supported"));
            }
          };

          MediaSourceStream.prototype._write = function (chunk, encoding, cb) {
            var self = this;
            if (self.destroyed) return;
            if (!self._sourceBuffer) {
              self._cb = function (err) {
                if (err) return cb(err);
                self._write(chunk, encoding, cb);
              };
              return;
            }

            if (self._sourceBuffer.updating) {
              return cb(
                new Error("Cannot append buffer while source buffer updating")
              );
            }

            var arr = toArrayBuffer(chunk);
            if (self._wrapper._debug) {
              self._debugBuffers.push(arr);
            }

            try {
              self._sourceBuffer.appendBuffer(arr);
            } catch (err) {
              // appendBuffer can throw for a number of reasons, most notably when the data
              // being appended is invalid or if appendBuffer is called after another error
              // already occurred on the media element. In Chrome, there may be useful debugging
              // info in chrome://media-internals
              self.destroy(err);
              return;
            }
            self._cb = cb;
          };

          MediaSourceStream.prototype._flow = function () {
            var self = this;

            if (
              self.destroyed ||
              !self._sourceBuffer ||
              self._sourceBuffer.updating
            ) {
              return;
            }

            if (self._mediaSource.readyState === "open") {
              // check buffer size
              if (self._getBufferDuration() > self._bufferDuration) {
                return;
              }
            }

            if (self._cb) {
              var cb = self._cb;
              self._cb = null;
              cb();
            }
          };

          // TODO: if zero actually works in all browsers, remove the logic associated with this below
          var EPSILON = 0;

          MediaSourceStream.prototype._getBufferDuration = function () {
            var self = this;

            var buffered = self._sourceBuffer.buffered;
            var currentTime = self._elem.currentTime;
            var bufferEnd = -1; // end of the buffer
            // This is a little over complex because some browsers seem to separate the
            // buffered region into multiple sections with slight gaps.
            for (var i = 0; i < buffered.length; i++) {
              var start = buffered.start(i);
              var end = buffered.end(i) + EPSILON;

              if (start > currentTime) {
                // Reached past the joined buffer
                break;
              } else if (bufferEnd >= 0 || currentTime <= end) {
                // Found the start/continuation of the joined buffer
                bufferEnd = end;
              }
            }

            var bufferedTime = bufferEnd - currentTime;
            if (bufferedTime < 0) {
              bufferedTime = 0;
            }

            return bufferedTime;
          };

          function downloadBuffers(bufs, name) {
            var a = document.createElement("a");
            a.href = window.URL.createObjectURL(new window.Blob(bufs));
            a.download = name;
            a.click();
          }
        },
        { inherits: 14, "readable-stream": 49, "to-arraybuffer": 58 },
      ],
      17: [
        function (require, module, exports) {
          "use strict";

          /**
           * @param typeMap [Object] Map of MIME type -> Array[extensions]
           * @param ...
           */
          function Mime() {
            this._types = Object.create(null);
            this._extensions = Object.create(null);

            for (let i = 0; i < arguments.length; i++) {
              this.define(arguments[i]);
            }

            this.define = this.define.bind(this);
            this.getType = this.getType.bind(this);
            this.getExtension = this.getExtension.bind(this);
          }

          /**
           * Define mimetype -> extension mappings.  Each key is a mime-type that maps
           * to an array of extensions associated with the type.  The first extension is
           * used as the default extension for the type.
           *
           * e.g. mime.define({'audio/ogg', ['oga', 'ogg', 'spx']});
           *
           * If a type declares an extension that has already been defined, an error will
           * be thrown.  To suppress this error and force the extension to be associated
           * with the new type, pass `force`=true.  Alternatively, you may prefix the
           * extension with "*" to map the type to extension, without mapping the
           * extension to the type.
           *
           * e.g. mime.define({'audio/wav', ['wav']}, {'audio/x-wav', ['*wav']});
           *
           *
           * @param map (Object) type definitions
           * @param force (Boolean) if true, force overriding of existing definitions
           */
          Mime.prototype.define = function (typeMap, force) {
            for (let type in typeMap) {
              let extensions = typeMap[type].map(function (t) {
                return t.toLowerCase();
              });
              type = type.toLowerCase();

              for (let i = 0; i < extensions.length; i++) {
                const ext = extensions[i];

                // '*' prefix = not the preferred type for this extension.  So fixup the
                // extension, and skip it.
                if (ext[0] === "*") {
                  continue;
                }

                if (!force && ext in this._types) {
                  throw new Error(
                    'Attempt to change mapping for "' +
                      ext +
                      '" extension from "' +
                      this._types[ext] +
                      '" to "' +
                      type +
                      '". Pass `force=true` to allow this, otherwise remove "' +
                      ext +
                      '" from the list of extensions for "' +
                      type +
                      '".'
                  );
                }

                this._types[ext] = type;
              }

              // Use first extension as default
              if (force || !this._extensions[type]) {
                const ext = extensions[0];
                this._extensions[type] = ext[0] !== "*" ? ext : ext.substr(1);
              }
            }
          };

          /**
           * Lookup a mime type based on extension
           */
          Mime.prototype.getType = function (path) {
            path = String(path);
            let last = path.replace(/^.*[/\\]/, "").toLowerCase();
            let ext = last.replace(/^.*\./, "").toLowerCase();

            let hasPath = last.length < path.length;
            let hasDot = ext.length < last.length - 1;

            return ((hasDot || !hasPath) && this._types[ext]) || null;
          };

          /**
           * Return file extension associated with a mime type
           */
          Mime.prototype.getExtension = function (type) {
            type = /^\s*([^;\s]*)/.test(type) && RegExp.$1;
            return (type && this._extensions[type.toLowerCase()]) || null;
          };

          module.exports = Mime;
        },
        {},
      ],
      18: [
        function (require, module, exports) {
          "use strict";

          let Mime = require("./Mime");
          module.exports = new Mime(
            require("./types/standard"),
            require("./types/other")
          );
        },
        { "./Mime": 17, "./types/other": 19, "./types/standard": 20 },
      ],
      19: [
        function (require, module, exports) {
          module.exports = {
            "application/prs.cww": ["cww"],
            "application/vnd.1000minds.decision-model+xml": ["1km"],
            "application/vnd.3gpp.pic-bw-large": ["plb"],
            "application/vnd.3gpp.pic-bw-small": ["psb"],
            "application/vnd.3gpp.pic-bw-var": ["pvb"],
            "application/vnd.3gpp2.tcap": ["tcap"],
            "application/vnd.3m.post-it-notes": ["pwn"],
            "application/vnd.accpac.simply.aso": ["aso"],
            "application/vnd.accpac.simply.imp": ["imp"],
            "application/vnd.acucobol": ["acu"],
            "application/vnd.acucorp": ["atc", "acutc"],
            "application/vnd.adobe.air-application-installer-package+zip": [
              "air",
            ],
            "application/vnd.adobe.formscentral.fcdt": ["fcdt"],
            "application/vnd.adobe.fxp": ["fxp", "fxpl"],
            "application/vnd.adobe.xdp+xml": ["xdp"],
            "application/vnd.adobe.xfdf": ["xfdf"],
            "application/vnd.ahead.space": ["ahead"],
            "application/vnd.airzip.filesecure.azf": ["azf"],
            "application/vnd.airzip.filesecure.azs": ["azs"],
            "application/vnd.amazon.ebook": ["azw"],
            "application/vnd.americandynamics.acc": ["acc"],
            "application/vnd.amiga.ami": ["ami"],
            "application/vnd.android.package-archive": ["apk"],
            "application/vnd.anser-web-certificate-issue-initiation": ["cii"],
            "application/vnd.anser-web-funds-transfer-initiation": ["fti"],
            "application/vnd.antix.game-component": ["atx"],
            "application/vnd.apple.installer+xml": ["mpkg"],
            "application/vnd.apple.keynote": ["key"],
            "application/vnd.apple.mpegurl": ["m3u8"],
            "application/vnd.apple.numbers": ["numbers"],
            "application/vnd.apple.pages": ["pages"],
            "application/vnd.apple.pkpass": ["pkpass"],
            "application/vnd.aristanetworks.swi": ["swi"],
            "application/vnd.astraea-software.iota": ["iota"],
            "application/vnd.audiograph": ["aep"],
            "application/vnd.balsamiq.bmml+xml": ["bmml"],
            "application/vnd.blueice.multipass": ["mpm"],
            "application/vnd.bmi": ["bmi"],
            "application/vnd.businessobjects": ["rep"],
            "application/vnd.chemdraw+xml": ["cdxml"],
            "application/vnd.chipnuts.karaoke-mmd": ["mmd"],
            "application/vnd.cinderella": ["cdy"],
            "application/vnd.citationstyles.style+xml": ["csl"],
            "application/vnd.claymore": ["cla"],
            "application/vnd.cloanto.rp9": ["rp9"],
            "application/vnd.clonk.c4group": [
              "c4g",
              "c4d",
              "c4f",
              "c4p",
              "c4u",
            ],
            "application/vnd.cluetrust.cartomobile-config": ["c11amc"],
            "application/vnd.cluetrust.cartomobile-config-pkg": ["c11amz"],
            "application/vnd.commonspace": ["csp"],
            "application/vnd.contact.cmsg": ["cdbcmsg"],
            "application/vnd.cosmocaller": ["cmc"],
            "application/vnd.crick.clicker": ["clkx"],
            "application/vnd.crick.clicker.keyboard": ["clkk"],
            "application/vnd.crick.clicker.palette": ["clkp"],
            "application/vnd.crick.clicker.template": ["clkt"],
            "application/vnd.crick.clicker.wordbank": ["clkw"],
            "application/vnd.criticaltools.wbs+xml": ["wbs"],
            "application/vnd.ctc-posml": ["pml"],
            "application/vnd.cups-ppd": ["ppd"],
            "application/vnd.curl.car": ["car"],
            "application/vnd.curl.pcurl": ["pcurl"],
            "application/vnd.dart": ["dart"],
            "application/vnd.data-vision.rdz": ["rdz"],
            "application/vnd.dbf": ["dbf"],
            "application/vnd.dece.data": ["uvf", "uvvf", "uvd", "uvvd"],
            "application/vnd.dece.ttml+xml": ["uvt", "uvvt"],
            "application/vnd.dece.unspecified": ["uvx", "uvvx"],
            "application/vnd.dece.zip": ["uvz", "uvvz"],
            "application/vnd.denovo.fcselayout-link": ["fe_launch"],
            "application/vnd.dna": ["dna"],
            "application/vnd.dolby.mlp": ["mlp"],
            "application/vnd.dpgraph": ["dpg"],
            "application/vnd.dreamfactory": ["dfac"],
            "application/vnd.ds-keypoint": ["kpxx"],
            "application/vnd.dvb.ait": ["ait"],
            "application/vnd.dvb.service": ["svc"],
            "application/vnd.dynageo": ["geo"],
            "application/vnd.ecowin.chart": ["mag"],
            "application/vnd.enliven": ["nml"],
            "application/vnd.epson.esf": ["esf"],
            "application/vnd.epson.msf": ["msf"],
            "application/vnd.epson.quickanime": ["qam"],
            "application/vnd.epson.salt": ["slt"],
            "application/vnd.epson.ssf": ["ssf"],
            "application/vnd.eszigno3+xml": ["es3", "et3"],
            "application/vnd.ezpix-album": ["ez2"],
            "application/vnd.ezpix-package": ["ez3"],
            "application/vnd.fdf": ["fdf"],
            "application/vnd.fdsn.mseed": ["mseed"],
            "application/vnd.fdsn.seed": ["seed", "dataless"],
            "application/vnd.flographit": ["gph"],
            "application/vnd.fluxtime.clip": ["ftc"],
            "application/vnd.framemaker": ["fm", "frame", "maker", "book"],
            "application/vnd.frogans.fnc": ["fnc"],
            "application/vnd.frogans.ltf": ["ltf"],
            "application/vnd.fsc.weblaunch": ["fsc"],
            "application/vnd.fujitsu.oasys": ["oas"],
            "application/vnd.fujitsu.oasys2": ["oa2"],
            "application/vnd.fujitsu.oasys3": ["oa3"],
            "application/vnd.fujitsu.oasysgp": ["fg5"],
            "application/vnd.fujitsu.oasysprs": ["bh2"],
            "application/vnd.fujixerox.ddd": ["ddd"],
            "application/vnd.fujixerox.docuworks": ["xdw"],
            "application/vnd.fujixerox.docuworks.binder": ["xbd"],
            "application/vnd.fuzzysheet": ["fzs"],
            "application/vnd.genomatix.tuxedo": ["txd"],
            "application/vnd.geogebra.file": ["ggb"],
            "application/vnd.geogebra.tool": ["ggt"],
            "application/vnd.geometry-explorer": ["gex", "gre"],
            "application/vnd.geonext": ["gxt"],
            "application/vnd.geoplan": ["g2w"],
            "application/vnd.geospace": ["g3w"],
            "application/vnd.gmx": ["gmx"],
            "application/vnd.google-apps.document": ["gdoc"],
            "application/vnd.google-apps.presentation": ["gslides"],
            "application/vnd.google-apps.spreadsheet": ["gsheet"],
            "application/vnd.google-earth.kml+xml": ["kml"],
            "application/vnd.google-earth.kmz": ["kmz"],
            "application/vnd.grafeq": ["gqf", "gqs"],
            "application/vnd.groove-account": ["gac"],
            "application/vnd.groove-help": ["ghf"],
            "application/vnd.groove-identity-message": ["gim"],
            "application/vnd.groove-injector": ["grv"],
            "application/vnd.groove-tool-message": ["gtm"],
            "application/vnd.groove-tool-template": ["tpl"],
            "application/vnd.groove-vcard": ["vcg"],
            "application/vnd.hal+xml": ["hal"],
            "application/vnd.handheld-entertainment+xml": ["zmm"],
            "application/vnd.hbci": ["hbci"],
            "application/vnd.hhe.lesson-player": ["les"],
            "application/vnd.hp-hpgl": ["hpgl"],
            "application/vnd.hp-hpid": ["hpid"],
            "application/vnd.hp-hps": ["hps"],
            "application/vnd.hp-jlyt": ["jlt"],
            "application/vnd.hp-pcl": ["pcl"],
            "application/vnd.hp-pclxl": ["pclxl"],
            "application/vnd.hydrostatix.sof-data": ["sfd-hdstx"],
            "application/vnd.ibm.minipay": ["mpy"],
            "application/vnd.ibm.modcap": ["afp", "listafp", "list3820"],
            "application/vnd.ibm.rights-management": ["irm"],
            "application/vnd.ibm.secure-container": ["sc"],
            "application/vnd.iccprofile": ["icc", "icm"],
            "application/vnd.igloader": ["igl"],
            "application/vnd.immervision-ivp": ["ivp"],
            "application/vnd.immervision-ivu": ["ivu"],
            "application/vnd.insors.igm": ["igm"],
            "application/vnd.intercon.formnet": ["xpw", "xpx"],
            "application/vnd.intergeo": ["i2g"],
            "application/vnd.intu.qbo": ["qbo"],
            "application/vnd.intu.qfx": ["qfx"],
            "application/vnd.ipunplugged.rcprofile": ["rcprofile"],
            "application/vnd.irepository.package+xml": ["irp"],
            "application/vnd.is-xpr": ["xpr"],
            "application/vnd.isac.fcs": ["fcs"],
            "application/vnd.jam": ["jam"],
            "application/vnd.jcp.javame.midlet-rms": ["rms"],
            "application/vnd.jisp": ["jisp"],
            "application/vnd.joost.joda-archive": ["joda"],
            "application/vnd.kahootz": ["ktz", "ktr"],
            "application/vnd.kde.karbon": ["karbon"],
            "application/vnd.kde.kchart": ["chrt"],
            "application/vnd.kde.kformula": ["kfo"],
            "application/vnd.kde.kivio": ["flw"],
            "application/vnd.kde.kontour": ["kon"],
            "application/vnd.kde.kpresenter": ["kpr", "kpt"],
            "application/vnd.kde.kspread": ["ksp"],
            "application/vnd.kde.kword": ["kwd", "kwt"],
            "application/vnd.kenameaapp": ["htke"],
            "application/vnd.kidspiration": ["kia"],
            "application/vnd.kinar": ["kne", "knp"],
            "application/vnd.koan": ["skp", "skd", "skt", "skm"],
            "application/vnd.kodak-descriptor": ["sse"],
            "application/vnd.las.las+xml": ["lasxml"],
            "application/vnd.llamagraphics.life-balance.desktop": ["lbd"],
            "application/vnd.llamagraphics.life-balance.exchange+xml": ["lbe"],
            "application/vnd.lotus-1-2-3": ["123"],
            "application/vnd.lotus-approach": ["apr"],
            "application/vnd.lotus-freelance": ["pre"],
            "application/vnd.lotus-notes": ["nsf"],
            "application/vnd.lotus-organizer": ["org"],
            "application/vnd.lotus-screencam": ["scm"],
            "application/vnd.lotus-wordpro": ["lwp"],
            "application/vnd.macports.portpkg": ["portpkg"],
            "application/vnd.mapbox-vector-tile": ["mvt"],
            "application/vnd.mcd": ["mcd"],
            "application/vnd.medcalcdata": ["mc1"],
            "application/vnd.mediastation.cdkey": ["cdkey"],
            "application/vnd.mfer": ["mwf"],
            "application/vnd.mfmp": ["mfm"],
            "application/vnd.micrografx.flo": ["flo"],
            "application/vnd.micrografx.igx": ["igx"],
            "application/vnd.mif": ["mif"],
            "application/vnd.mobius.daf": ["daf"],
            "application/vnd.mobius.dis": ["dis"],
            "application/vnd.mobius.mbk": ["mbk"],
            "application/vnd.mobius.mqy": ["mqy"],
            "application/vnd.mobius.msl": ["msl"],
            "application/vnd.mobius.plc": ["plc"],
            "application/vnd.mobius.txf": ["txf"],
            "application/vnd.mophun.application": ["mpn"],
            "application/vnd.mophun.certificate": ["mpc"],
            "application/vnd.mozilla.xul+xml": ["xul"],
            "application/vnd.ms-artgalry": ["cil"],
            "application/vnd.ms-cab-compressed": ["cab"],
            "application/vnd.ms-excel": [
              "xls",
              "xlm",
              "xla",
              "xlc",
              "xlt",
              "xlw",
            ],
            "application/vnd.ms-excel.addin.macroenabled.12": ["xlam"],
            "application/vnd.ms-excel.sheet.binary.macroenabled.12": ["xlsb"],
            "application/vnd.ms-excel.sheet.macroenabled.12": ["xlsm"],
            "application/vnd.ms-excel.template.macroenabled.12": ["xltm"],
            "application/vnd.ms-fontobject": ["eot"],
            "application/vnd.ms-htmlhelp": ["chm"],
            "application/vnd.ms-ims": ["ims"],
            "application/vnd.ms-lrm": ["lrm"],
            "application/vnd.ms-officetheme": ["thmx"],
            "application/vnd.ms-outlook": ["msg"],
            "application/vnd.ms-pki.seccat": ["cat"],
            "application/vnd.ms-pki.stl": ["*stl"],
            "application/vnd.ms-powerpoint": ["ppt", "pps", "pot"],
            "application/vnd.ms-powerpoint.addin.macroenabled.12": ["ppam"],
            "application/vnd.ms-powerpoint.presentation.macroenabled.12": [
              "pptm",
            ],
            "application/vnd.ms-powerpoint.slide.macroenabled.12": ["sldm"],
            "application/vnd.ms-powerpoint.slideshow.macroenabled.12": ["ppsm"],
            "application/vnd.ms-powerpoint.template.macroenabled.12": ["potm"],
            "application/vnd.ms-project": ["mpp", "mpt"],
            "application/vnd.ms-word.document.macroenabled.12": ["docm"],
            "application/vnd.ms-word.template.macroenabled.12": ["dotm"],
            "application/vnd.ms-works": ["wps", "wks", "wcm", "wdb"],
            "application/vnd.ms-wpl": ["wpl"],
            "application/vnd.ms-xpsdocument": ["xps"],
            "application/vnd.mseq": ["mseq"],
            "application/vnd.musician": ["mus"],
            "application/vnd.muvee.style": ["msty"],
            "application/vnd.mynfc": ["taglet"],
            "application/vnd.neurolanguage.nlu": ["nlu"],
            "application/vnd.nitf": ["ntf", "nitf"],
            "application/vnd.noblenet-directory": ["nnd"],
            "application/vnd.noblenet-sealer": ["nns"],
            "application/vnd.noblenet-web": ["nnw"],
            "application/vnd.nokia.n-gage.ac+xml": ["*ac"],
            "application/vnd.nokia.n-gage.data": ["ngdat"],
            "application/vnd.nokia.n-gage.symbian.install": ["n-gage"],
            "application/vnd.nokia.radio-preset": ["rpst"],
            "application/vnd.nokia.radio-presets": ["rpss"],
            "application/vnd.novadigm.edm": ["edm"],
            "application/vnd.novadigm.edx": ["edx"],
            "application/vnd.novadigm.ext": ["ext"],
            "application/vnd.oasis.opendocument.chart": ["odc"],
            "application/vnd.oasis.opendocument.chart-template": ["otc"],
            "application/vnd.oasis.opendocument.database": ["odb"],
            "application/vnd.oasis.opendocument.formula": ["odf"],
            "application/vnd.oasis.opendocument.formula-template": ["odft"],
            "application/vnd.oasis.opendocument.graphics": ["odg"],
            "application/vnd.oasis.opendocument.graphics-template": ["otg"],
            "application/vnd.oasis.opendocument.image": ["odi"],
            "application/vnd.oasis.opendocument.image-template": ["oti"],
            "application/vnd.oasis.opendocument.presentation": ["odp"],
            "application/vnd.oasis.opendocument.presentation-template": ["otp"],
            "application/vnd.oasis.opendocument.spreadsheet": ["ods"],
            "application/vnd.oasis.opendocument.spreadsheet-template": ["ots"],
            "application/vnd.oasis.opendocument.text": ["odt"],
            "application/vnd.oasis.opendocument.text-master": ["odm"],
            "application/vnd.oasis.opendocument.text-template": ["ott"],
            "application/vnd.oasis.opendocument.text-web": ["oth"],
            "application/vnd.olpc-sugar": ["xo"],
            "application/vnd.oma.dd2+xml": ["dd2"],
            "application/vnd.openblox.game+xml": ["obgx"],
            "application/vnd.openofficeorg.extension": ["oxt"],
            "application/vnd.openstreetmap.data+xml": ["osm"],
            "application/vnd.openxmlformats-officedocument.presentationml.presentation":
              ["pptx"],
            "application/vnd.openxmlformats-officedocument.presentationml.slide":
              ["sldx"],
            "application/vnd.openxmlformats-officedocument.presentationml.slideshow":
              ["ppsx"],
            "application/vnd.openxmlformats-officedocument.presentationml.template":
              ["potx"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
              ["xlsx"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.template":
              ["xltx"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
              ["docx"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.template":
              ["dotx"],
            "application/vnd.osgeo.mapguide.package": ["mgp"],
            "application/vnd.osgi.dp": ["dp"],
            "application/vnd.osgi.subsystem": ["esa"],
            "application/vnd.palm": ["pdb", "pqa", "oprc"],
            "application/vnd.pawaafile": ["paw"],
            "application/vnd.pg.format": ["str"],
            "application/vnd.pg.osasli": ["ei6"],
            "application/vnd.picsel": ["efif"],
            "application/vnd.pmi.widget": ["wg"],
            "application/vnd.pocketlearn": ["plf"],
            "application/vnd.powerbuilder6": ["pbd"],
            "application/vnd.previewsystems.box": ["box"],
            "application/vnd.proteus.magazine": ["mgz"],
            "application/vnd.publishare-delta-tree": ["qps"],
            "application/vnd.pvi.ptid1": ["ptid"],
            "application/vnd.quark.quarkxpress": [
              "qxd",
              "qxt",
              "qwd",
              "qwt",
              "qxl",
              "qxb",
            ],
            "application/vnd.rar": ["rar"],
            "application/vnd.realvnc.bed": ["bed"],
            "application/vnd.recordare.musicxml": ["mxl"],
            "application/vnd.recordare.musicxml+xml": ["musicxml"],
            "application/vnd.rig.cryptonote": ["cryptonote"],
            "application/vnd.rim.cod": ["cod"],
            "application/vnd.rn-realmedia": ["rm"],
            "application/vnd.rn-realmedia-vbr": ["rmvb"],
            "application/vnd.route66.link66+xml": ["link66"],
            "application/vnd.sailingtracker.track": ["st"],
            "application/vnd.seemail": ["see"],
            "application/vnd.sema": ["sema"],
            "application/vnd.semd": ["semd"],
            "application/vnd.semf": ["semf"],
            "application/vnd.shana.informed.formdata": ["ifm"],
            "application/vnd.shana.informed.formtemplate": ["itp"],
            "application/vnd.shana.informed.interchange": ["iif"],
            "application/vnd.shana.informed.package": ["ipk"],
            "application/vnd.simtech-mindmapper": ["twd", "twds"],
            "application/vnd.smaf": ["mmf"],
            "application/vnd.smart.teacher": ["teacher"],
            "application/vnd.software602.filler.form+xml": ["fo"],
            "application/vnd.solent.sdkm+xml": ["sdkm", "sdkd"],
            "application/vnd.spotfire.dxp": ["dxp"],
            "application/vnd.spotfire.sfs": ["sfs"],
            "application/vnd.stardivision.calc": ["sdc"],
            "application/vnd.stardivision.draw": ["sda"],
            "application/vnd.stardivision.impress": ["sdd"],
            "application/vnd.stardivision.math": ["smf"],
            "application/vnd.stardivision.writer": ["sdw", "vor"],
            "application/vnd.stardivision.writer-global": ["sgl"],
            "application/vnd.stepmania.package": ["smzip"],
            "application/vnd.stepmania.stepchart": ["sm"],
            "application/vnd.sun.wadl+xml": ["wadl"],
            "application/vnd.sun.xml.calc": ["sxc"],
            "application/vnd.sun.xml.calc.template": ["stc"],
            "application/vnd.sun.xml.draw": ["sxd"],
            "application/vnd.sun.xml.draw.template": ["std"],
            "application/vnd.sun.xml.impress": ["sxi"],
            "application/vnd.sun.xml.impress.template": ["sti"],
            "application/vnd.sun.xml.math": ["sxm"],
            "application/vnd.sun.xml.writer": ["sxw"],
            "application/vnd.sun.xml.writer.global": ["sxg"],
            "application/vnd.sun.xml.writer.template": ["stw"],
            "application/vnd.sus-calendar": ["sus", "susp"],
            "application/vnd.svd": ["svd"],
            "application/vnd.symbian.install": ["sis", "sisx"],
            "application/vnd.syncml+xml": ["xsm"],
            "application/vnd.syncml.dm+wbxml": ["bdm"],
            "application/vnd.syncml.dm+xml": ["xdm"],
            "application/vnd.syncml.dmddf+xml": ["ddf"],
            "application/vnd.tao.intent-module-archive": ["tao"],
            "application/vnd.tcpdump.pcap": ["pcap", "cap", "dmp"],
            "application/vnd.tmobile-livetv": ["tmo"],
            "application/vnd.trid.tpt": ["tpt"],
            "application/vnd.triscape.mxs": ["mxs"],
            "application/vnd.trueapp": ["tra"],
            "application/vnd.ufdl": ["ufd", "ufdl"],
            "application/vnd.uiq.theme": ["utz"],
            "application/vnd.umajin": ["umj"],
            "application/vnd.unity": ["unityweb"],
            "application/vnd.uoml+xml": ["uoml"],
            "application/vnd.vcx": ["vcx"],
            "application/vnd.visio": ["vsd", "vst", "vss", "vsw"],
            "application/vnd.visionary": ["vis"],
            "application/vnd.vsf": ["vsf"],
            "application/vnd.wap.wbxml": ["wbxml"],
            "application/vnd.wap.wmlc": ["wmlc"],
            "application/vnd.wap.wmlscriptc": ["wmlsc"],
            "application/vnd.webturbo": ["wtb"],
            "application/vnd.wolfram.player": ["nbp"],
            "application/vnd.wordperfect": ["wpd"],
            "application/vnd.wqd": ["wqd"],
            "application/vnd.wt.stf": ["stf"],
            "application/vnd.xara": ["xar"],
            "application/vnd.xfdl": ["xfdl"],
            "application/vnd.yamaha.hv-dic": ["hvd"],
            "application/vnd.yamaha.hv-script": ["hvs"],
            "application/vnd.yamaha.hv-voice": ["hvp"],
            "application/vnd.yamaha.openscoreformat": ["osf"],
            "application/vnd.yamaha.openscoreformat.osfpvg+xml": ["osfpvg"],
            "application/vnd.yamaha.smaf-audio": ["saf"],
            "application/vnd.yamaha.smaf-phrase": ["spf"],
            "application/vnd.yellowriver-custom-menu": ["cmp"],
            "application/vnd.zul": ["zir", "zirz"],
            "application/vnd.zzazz.deck+xml": ["zaz"],
            "application/x-7z-compressed": ["7z"],
            "application/x-abiword": ["abw"],
            "application/x-ace-compressed": ["ace"],
            "application/x-apple-diskimage": ["*dmg"],
            "application/x-arj": ["arj"],
            "application/x-authorware-bin": ["aab", "x32", "u32", "vox"],
            "application/x-authorware-map": ["aam"],
            "application/x-authorware-seg": ["aas"],
            "application/x-bcpio": ["bcpio"],
            "application/x-bdoc": ["*bdoc"],
            "application/x-bittorrent": ["torrent"],
            "application/x-blorb": ["blb", "blorb"],
            "application/x-bzip": ["bz"],
            "application/x-bzip2": ["bz2", "boz"],
            "application/x-cbr": ["cbr", "cba", "cbt", "cbz", "cb7"],
            "application/x-cdlink": ["vcd"],
            "application/x-cfs-compressed": ["cfs"],
            "application/x-chat": ["chat"],
            "application/x-chess-pgn": ["pgn"],
            "application/x-chrome-extension": ["crx"],
            "application/x-cocoa": ["cco"],
            "application/x-conference": ["nsc"],
            "application/x-cpio": ["cpio"],
            "application/x-csh": ["csh"],
            "application/x-debian-package": ["*deb", "udeb"],
            "application/x-dgc-compressed": ["dgc"],
            "application/x-director": [
              "dir",
              "dcr",
              "dxr",
              "cst",
              "cct",
              "cxt",
              "w3d",
              "fgd",
              "swa",
            ],
            "application/x-doom": ["wad"],
            "application/x-dtbncx+xml": ["ncx"],
            "application/x-dtbook+xml": ["dtb"],
            "application/x-dtbresource+xml": ["res"],
            "application/x-dvi": ["dvi"],
            "application/x-envoy": ["evy"],
            "application/x-eva": ["eva"],
            "application/x-font-bdf": ["bdf"],
            "application/x-font-ghostscript": ["gsf"],
            "application/x-font-linux-psf": ["psf"],
            "application/x-font-pcf": ["pcf"],
            "application/x-font-snf": ["snf"],
            "application/x-font-type1": ["pfa", "pfb", "pfm", "afm"],
            "application/x-freearc": ["arc"],
            "application/x-futuresplash": ["spl"],
            "application/x-gca-compressed": ["gca"],
            "application/x-glulx": ["ulx"],
            "application/x-gnumeric": ["gnumeric"],
            "application/x-gramps-xml": ["gramps"],
            "application/x-gtar": ["gtar"],
            "application/x-hdf": ["hdf"],
            "application/x-httpd-php": ["php"],
            "application/x-install-instructions": ["install"],
            "application/x-iso9660-image": ["*iso"],
            "application/x-iwork-keynote-sffkey": ["*key"],
            "application/x-iwork-numbers-sffnumbers": ["*numbers"],
            "application/x-iwork-pages-sffpages": ["*pages"],
            "application/x-java-archive-diff": ["jardiff"],
            "application/x-java-jnlp-file": ["jnlp"],
            "application/x-keepass2": ["kdbx"],
            "application/x-latex": ["latex"],
            "application/x-lua-bytecode": ["luac"],
            "application/x-lzh-compressed": ["lzh", "lha"],
            "application/x-makeself": ["run"],
            "application/x-mie": ["mie"],
            "application/x-mobipocket-ebook": ["prc", "mobi"],
            "application/x-ms-application": ["application"],
            "application/x-ms-shortcut": ["lnk"],
            "application/x-ms-wmd": ["wmd"],
            "application/x-ms-wmz": ["wmz"],
            "application/x-ms-xbap": ["xbap"],
            "application/x-msaccess": ["mdb"],
            "application/x-msbinder": ["obd"],
            "application/x-mscardfile": ["crd"],
            "application/x-msclip": ["clp"],
            "application/x-msdos-program": ["*exe"],
            "application/x-msdownload": ["*exe", "*dll", "com", "bat", "*msi"],
            "application/x-msmediaview": ["mvb", "m13", "m14"],
            "application/x-msmetafile": ["*wmf", "*wmz", "*emf", "emz"],
            "application/x-msmoney": ["mny"],
            "application/x-mspublisher": ["pub"],
            "application/x-msschedule": ["scd"],
            "application/x-msterminal": ["trm"],
            "application/x-mswrite": ["wri"],
            "application/x-netcdf": ["nc", "cdf"],
            "application/x-ns-proxy-autoconfig": ["pac"],
            "application/x-nzb": ["nzb"],
            "application/x-perl": ["pl", "pm"],
            "application/x-pilot": ["*prc", "*pdb"],
            "application/x-pkcs12": ["p12", "pfx"],
            "application/x-pkcs7-certificates": ["p7b", "spc"],
            "application/x-pkcs7-certreqresp": ["p7r"],
            "application/x-rar-compressed": ["*rar"],
            "application/x-redhat-package-manager": ["rpm"],
            "application/x-research-info-systems": ["ris"],
            "application/x-sea": ["sea"],
            "application/x-sh": ["sh"],
            "application/x-shar": ["shar"],
            "application/x-shockwave-flash": ["swf"],
            "application/x-silverlight-app": ["xap"],
            "application/x-sql": ["sql"],
            "application/x-stuffit": ["sit"],
            "application/x-stuffitx": ["sitx"],
            "application/x-subrip": ["srt"],
            "application/x-sv4cpio": ["sv4cpio"],
            "application/x-sv4crc": ["sv4crc"],
            "application/x-t3vm-image": ["t3"],
            "application/x-tads": ["gam"],
            "application/x-tar": ["tar"],
            "application/x-tcl": ["tcl", "tk"],
            "application/x-tex": ["tex"],
            "application/x-tex-tfm": ["tfm"],
            "application/x-texinfo": ["texinfo", "texi"],
            "application/x-tgif": ["*obj"],
            "application/x-ustar": ["ustar"],
            "application/x-virtualbox-hdd": ["hdd"],
            "application/x-virtualbox-ova": ["ova"],
            "application/x-virtualbox-ovf": ["ovf"],
            "application/x-virtualbox-vbox": ["vbox"],
            "application/x-virtualbox-vbox-extpack": ["vbox-extpack"],
            "application/x-virtualbox-vdi": ["vdi"],
            "application/x-virtualbox-vhd": ["vhd"],
            "application/x-virtualbox-vmdk": ["vmdk"],
            "application/x-wais-source": ["src"],
            "application/x-web-app-manifest+json": ["webapp"],
            "application/x-x509-ca-cert": ["der", "crt", "pem"],
            "application/x-xfig": ["fig"],
            "application/x-xliff+xml": ["*xlf"],
            "application/x-xpinstall": ["xpi"],
            "application/x-xz": ["xz"],
            "application/x-zmachine": [
              "z1",
              "z2",
              "z3",
              "z4",
              "z5",
              "z6",
              "z7",
              "z8",
            ],
            "audio/vnd.dece.audio": ["uva", "uvva"],
            "audio/vnd.digital-winds": ["eol"],
            "audio/vnd.dra": ["dra"],
            "audio/vnd.dts": ["dts"],
            "audio/vnd.dts.hd": ["dtshd"],
            "audio/vnd.lucent.voice": ["lvp"],
            "audio/vnd.ms-playready.media.pya": ["pya"],
            "audio/vnd.nuera.ecelp4800": ["ecelp4800"],
            "audio/vnd.nuera.ecelp7470": ["ecelp7470"],
            "audio/vnd.nuera.ecelp9600": ["ecelp9600"],
            "audio/vnd.rip": ["rip"],
            "audio/x-aac": ["aac"],
            "audio/x-aiff": ["aif", "aiff", "aifc"],
            "audio/x-caf": ["caf"],
            "audio/x-flac": ["flac"],
            "audio/x-m4a": ["*m4a"],
            "audio/x-matroska": ["mka"],
            "audio/x-mpegurl": ["m3u"],
            "audio/x-ms-wax": ["wax"],
            "audio/x-ms-wma": ["wma"],
            "audio/x-pn-realaudio": ["ram", "ra"],
            "audio/x-pn-realaudio-plugin": ["rmp"],
            "audio/x-realaudio": ["*ra"],
            "audio/x-wav": ["*wav"],
            "chemical/x-cdx": ["cdx"],
            "chemical/x-cif": ["cif"],
            "chemical/x-cmdf": ["cmdf"],
            "chemical/x-cml": ["cml"],
            "chemical/x-csml": ["csml"],
            "chemical/x-xyz": ["xyz"],
            "image/prs.btif": ["btif"],
            "image/prs.pti": ["pti"],
            "image/vnd.adobe.photoshop": ["psd"],
            "image/vnd.airzip.accelerator.azv": ["azv"],
            "image/vnd.dece.graphic": ["uvi", "uvvi", "uvg", "uvvg"],
            "image/vnd.djvu": ["djvu", "djv"],
            "image/vnd.dvb.subtitle": ["*sub"],
            "image/vnd.dwg": ["dwg"],
            "image/vnd.dxf": ["dxf"],
            "image/vnd.fastbidsheet": ["fbs"],
            "image/vnd.fpx": ["fpx"],
            "image/vnd.fst": ["fst"],
            "image/vnd.fujixerox.edmics-mmr": ["mmr"],
            "image/vnd.fujixerox.edmics-rlc": ["rlc"],
            "image/vnd.microsoft.icon": ["ico"],
            "image/vnd.ms-dds": ["dds"],
            "image/vnd.ms-modi": ["mdi"],
            "image/vnd.ms-photo": ["wdp"],
            "image/vnd.net-fpx": ["npx"],
            "image/vnd.pco.b16": ["b16"],
            "image/vnd.tencent.tap": ["tap"],
            "image/vnd.valve.source.texture": ["vtf"],
            "image/vnd.wap.wbmp": ["wbmp"],
            "image/vnd.xiff": ["xif"],
            "image/vnd.zbrush.pcx": ["pcx"],
            "image/x-3ds": ["3ds"],
            "image/x-cmu-raster": ["ras"],
            "image/x-cmx": ["cmx"],
            "image/x-freehand": ["fh", "fhc", "fh4", "fh5", "fh7"],
            "image/x-icon": ["*ico"],
            "image/x-jng": ["jng"],
            "image/x-mrsid-image": ["sid"],
            "image/x-ms-bmp": ["*bmp"],
            "image/x-pcx": ["*pcx"],
            "image/x-pict": ["pic", "pct"],
            "image/x-portable-anymap": ["pnm"],
            "image/x-portable-bitmap": ["pbm"],
            "image/x-portable-graymap": ["pgm"],
            "image/x-portable-pixmap": ["ppm"],
            "image/x-rgb": ["rgb"],
            "image/x-tga": ["tga"],
            "image/x-xbitmap": ["xbm"],
            "image/x-xpixmap": ["xpm"],
            "image/x-xwindowdump": ["xwd"],
            "message/vnd.wfa.wsc": ["wsc"],
            "model/vnd.collada+xml": ["dae"],
            "model/vnd.dwf": ["dwf"],
            "model/vnd.gdl": ["gdl"],
            "model/vnd.gtw": ["gtw"],
            "model/vnd.mts": ["mts"],
            "model/vnd.opengex": ["ogex"],
            "model/vnd.parasolid.transmit.binary": ["x_b"],
            "model/vnd.parasolid.transmit.text": ["x_t"],
            "model/vnd.sap.vds": ["vds"],
            "model/vnd.usdz+zip": ["usdz"],
            "model/vnd.valve.source.compiled-map": ["bsp"],
            "model/vnd.vtu": ["vtu"],
            "text/prs.lines.tag": ["dsc"],
            "text/vnd.curl": ["curl"],
            "text/vnd.curl.dcurl": ["dcurl"],
            "text/vnd.curl.mcurl": ["mcurl"],
            "text/vnd.curl.scurl": ["scurl"],
            "text/vnd.dvb.subtitle": ["sub"],
            "text/vnd.fly": ["fly"],
            "text/vnd.fmi.flexstor": ["flx"],
            "text/vnd.graphviz": ["gv"],
            "text/vnd.in3d.3dml": ["3dml"],
            "text/vnd.in3d.spot": ["spot"],
            "text/vnd.sun.j2me.app-descriptor": ["jad"],
            "text/vnd.wap.wml": ["wml"],
            "text/vnd.wap.wmlscript": ["wmls"],
            "text/x-asm": ["s", "asm"],
            "text/x-c": ["c", "cc", "cxx", "cpp", "h", "hh", "dic"],
            "text/x-component": ["htc"],
            "text/x-fortran": ["f", "for", "f77", "f90"],
            "text/x-handlebars-template": ["hbs"],
            "text/x-java-source": ["java"],
            "text/x-lua": ["lua"],
            "text/x-markdown": ["mkd"],
            "text/x-nfo": ["nfo"],
            "text/x-opml": ["opml"],
            "text/x-org": ["*org"],
            "text/x-pascal": ["p", "pas"],
            "text/x-processing": ["pde"],
            "text/x-sass": ["sass"],
            "text/x-scss": ["scss"],
            "text/x-setext": ["etx"],
            "text/x-sfv": ["sfv"],
            "text/x-suse-ymp": ["ymp"],
            "text/x-uuencode": ["uu"],
            "text/x-vcalendar": ["vcs"],
            "text/x-vcard": ["vcf"],
            "video/vnd.dece.hd": ["uvh", "uvvh"],
            "video/vnd.dece.mobile": ["uvm", "uvvm"],
            "video/vnd.dece.pd": ["uvp", "uvvp"],
            "video/vnd.dece.sd": ["uvs", "uvvs"],
            "video/vnd.dece.video": ["uvv", "uvvv"],
            "video/vnd.dvb.file": ["dvb"],
            "video/vnd.fvt": ["fvt"],
            "video/vnd.mpegurl": ["mxu", "m4u"],
            "video/vnd.ms-playready.media.pyv": ["pyv"],
            "video/vnd.uvvu.mp4": ["uvu", "uvvu"],
            "video/vnd.vivo": ["viv"],
            "video/x-f4v": ["f4v"],
            "video/x-fli": ["fli"],
            "video/x-flv": ["flv"],
            "video/x-m4v": ["m4v"],
            "video/x-matroska": ["mkv", "mk3d", "mks"],
            "video/x-mng": ["mng"],
            "video/x-ms-asf": ["asf", "asx"],
            "video/x-ms-vob": ["vob"],
            "video/x-ms-wm": ["wm"],
            "video/x-ms-wmv": ["wmv"],
            "video/x-ms-wmx": ["wmx"],
            "video/x-ms-wvx": ["wvx"],
            "video/x-msvideo": ["avi"],
            "video/x-sgi-movie": ["movie"],
            "video/x-smv": ["smv"],
            "x-conference/x-cooltalk": ["ice"],
          };
        },
        {},
      ],
      20: [
        function (require, module, exports) {
          module.exports = {
            "application/andrew-inset": ["ez"],
            "application/applixware": ["aw"],
            "application/atom+xml": ["atom"],
            "application/atomcat+xml": ["atomcat"],
            "application/atomdeleted+xml": ["atomdeleted"],
            "application/atomsvc+xml": ["atomsvc"],
            "application/atsc-dwd+xml": ["dwd"],
            "application/atsc-held+xml": ["held"],
            "application/atsc-rsat+xml": ["rsat"],
            "application/bdoc": ["bdoc"],
            "application/calendar+xml": ["xcs"],
            "application/ccxml+xml": ["ccxml"],
            "application/cdfx+xml": ["cdfx"],
            "application/cdmi-capability": ["cdmia"],
            "application/cdmi-container": ["cdmic"],
            "application/cdmi-domain": ["cdmid"],
            "application/cdmi-object": ["cdmio"],
            "application/cdmi-queue": ["cdmiq"],
            "application/cu-seeme": ["cu"],
            "application/dash+xml": ["mpd"],
            "application/davmount+xml": ["davmount"],
            "application/docbook+xml": ["dbk"],
            "application/dssc+der": ["dssc"],
            "application/dssc+xml": ["xdssc"],
            "application/ecmascript": ["es", "ecma"],
            "application/emma+xml": ["emma"],
            "application/emotionml+xml": ["emotionml"],
            "application/epub+zip": ["epub"],
            "application/exi": ["exi"],
            "application/express": ["exp"],
            "application/fdt+xml": ["fdt"],
            "application/font-tdpfr": ["pfr"],
            "application/geo+json": ["geojson"],
            "application/gml+xml": ["gml"],
            "application/gpx+xml": ["gpx"],
            "application/gxf": ["gxf"],
            "application/gzip": ["gz"],
            "application/hjson": ["hjson"],
            "application/hyperstudio": ["stk"],
            "application/inkml+xml": ["ink", "inkml"],
            "application/ipfix": ["ipfix"],
            "application/its+xml": ["its"],
            "application/java-archive": ["jar", "war", "ear"],
            "application/java-serialized-object": ["ser"],
            "application/java-vm": ["class"],
            "application/javascript": ["js", "mjs"],
            "application/json": ["json", "map"],
            "application/json5": ["json5"],
            "application/jsonml+json": ["jsonml"],
            "application/ld+json": ["jsonld"],
            "application/lgr+xml": ["lgr"],
            "application/lost+xml": ["lostxml"],
            "application/mac-binhex40": ["hqx"],
            "application/mac-compactpro": ["cpt"],
            "application/mads+xml": ["mads"],
            "application/manifest+json": ["webmanifest"],
            "application/marc": ["mrc"],
            "application/marcxml+xml": ["mrcx"],
            "application/mathematica": ["ma", "nb", "mb"],
            "application/mathml+xml": ["mathml"],
            "application/mbox": ["mbox"],
            "application/mediaservercontrol+xml": ["mscml"],
            "application/metalink+xml": ["metalink"],
            "application/metalink4+xml": ["meta4"],
            "application/mets+xml": ["mets"],
            "application/mmt-aei+xml": ["maei"],
            "application/mmt-usd+xml": ["musd"],
            "application/mods+xml": ["mods"],
            "application/mp21": ["m21", "mp21"],
            "application/mp4": ["mp4s", "m4p"],
            "application/msword": ["doc", "dot"],
            "application/mxf": ["mxf"],
            "application/n-quads": ["nq"],
            "application/n-triples": ["nt"],
            "application/node": ["cjs"],
            "application/octet-stream": [
              "bin",
              "dms",
              "lrf",
              "mar",
              "so",
              "dist",
              "distz",
              "pkg",
              "bpk",
              "dump",
              "elc",
              "deploy",
              "exe",
              "dll",
              "deb",
              "dmg",
              "iso",
              "img",
              "msi",
              "msp",
              "msm",
              "buffer",
            ],
            "application/oda": ["oda"],
            "application/oebps-package+xml": ["opf"],
            "application/ogg": ["ogx"],
            "application/omdoc+xml": ["omdoc"],
            "application/onenote": ["onetoc", "onetoc2", "onetmp", "onepkg"],
            "application/oxps": ["oxps"],
            "application/p2p-overlay+xml": ["relo"],
            "application/patch-ops-error+xml": ["xer"],
            "application/pdf": ["pdf"],
            "application/pgp-encrypted": ["pgp"],
            "application/pgp-signature": ["asc", "sig"],
            "application/pics-rules": ["prf"],
            "application/pkcs10": ["p10"],
            "application/pkcs7-mime": ["p7m", "p7c"],
            "application/pkcs7-signature": ["p7s"],
            "application/pkcs8": ["p8"],
            "application/pkix-attr-cert": ["ac"],
            "application/pkix-cert": ["cer"],
            "application/pkix-crl": ["crl"],
            "application/pkix-pkipath": ["pkipath"],
            "application/pkixcmp": ["pki"],
            "application/pls+xml": ["pls"],
            "application/postscript": ["ai", "eps", "ps"],
            "application/provenance+xml": ["provx"],
            "application/pskc+xml": ["pskcxml"],
            "application/raml+yaml": ["raml"],
            "application/rdf+xml": ["rdf", "owl"],
            "application/reginfo+xml": ["rif"],
            "application/relax-ng-compact-syntax": ["rnc"],
            "application/resource-lists+xml": ["rl"],
            "application/resource-lists-diff+xml": ["rld"],
            "application/rls-services+xml": ["rs"],
            "application/route-apd+xml": ["rapd"],
            "application/route-s-tsid+xml": ["sls"],
            "application/route-usd+xml": ["rusd"],
            "application/rpki-ghostbusters": ["gbr"],
            "application/rpki-manifest": ["mft"],
            "application/rpki-roa": ["roa"],
            "application/rsd+xml": ["rsd"],
            "application/rss+xml": ["rss"],
            "application/rtf": ["rtf"],
            "application/sbml+xml": ["sbml"],
            "application/scvp-cv-request": ["scq"],
            "application/scvp-cv-response": ["scs"],
            "application/scvp-vp-request": ["spq"],
            "application/scvp-vp-response": ["spp"],
            "application/sdp": ["sdp"],
            "application/senml+xml": ["senmlx"],
            "application/sensml+xml": ["sensmlx"],
            "application/set-payment-initiation": ["setpay"],
            "application/set-registration-initiation": ["setreg"],
            "application/shf+xml": ["shf"],
            "application/sieve": ["siv", "sieve"],
            "application/smil+xml": ["smi", "smil"],
            "application/sparql-query": ["rq"],
            "application/sparql-results+xml": ["srx"],
            "application/srgs": ["gram"],
            "application/srgs+xml": ["grxml"],
            "application/sru+xml": ["sru"],
            "application/ssdl+xml": ["ssdl"],
            "application/ssml+xml": ["ssml"],
            "application/swid+xml": ["swidtag"],
            "application/tei+xml": ["tei", "teicorpus"],
            "application/thraud+xml": ["tfi"],
            "application/timestamped-data": ["tsd"],
            "application/toml": ["toml"],
            "application/trig": ["trig"],
            "application/ttml+xml": ["ttml"],
            "application/ubjson": ["ubj"],
            "application/urc-ressheet+xml": ["rsheet"],
            "application/urc-targetdesc+xml": ["td"],
            "application/voicexml+xml": ["vxml"],
            "application/wasm": ["wasm"],
            "application/widget": ["wgt"],
            "application/winhlp": ["hlp"],
            "application/wsdl+xml": ["wsdl"],
            "application/wspolicy+xml": ["wspolicy"],
            "application/xaml+xml": ["xaml"],
            "application/xcap-att+xml": ["xav"],
            "application/xcap-caps+xml": ["xca"],
            "application/xcap-diff+xml": ["xdf"],
            "application/xcap-el+xml": ["xel"],
            "application/xcap-ns+xml": ["xns"],
            "application/xenc+xml": ["xenc"],
            "application/xhtml+xml": ["xhtml", "xht"],
            "application/xliff+xml": ["xlf"],
            "application/xml": ["xml", "xsl", "xsd", "rng"],
            "application/xml-dtd": ["dtd"],
            "application/xop+xml": ["xop"],
            "application/xproc+xml": ["xpl"],
            "application/xslt+xml": ["*xsl", "xslt"],
            "application/xspf+xml": ["xspf"],
            "application/xv+xml": ["mxml", "xhvml", "xvml", "xvm"],
            "application/yang": ["yang"],
            "application/yin+xml": ["yin"],
            "application/zip": ["zip"],
            "audio/3gpp": ["*3gpp"],
            "audio/adpcm": ["adp"],
            "audio/amr": ["amr"],
            "audio/basic": ["au", "snd"],
            "audio/midi": ["mid", "midi", "kar", "rmi"],
            "audio/mobile-xmf": ["mxmf"],
            "audio/mp3": ["*mp3"],
            "audio/mp4": ["m4a", "mp4a"],
            "audio/mpeg": ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"],
            "audio/ogg": ["oga", "ogg", "spx", "opus"],
            "audio/s3m": ["s3m"],
            "audio/silk": ["sil"],
            "audio/wav": ["wav"],
            "audio/wave": ["*wav"],
            "audio/webm": ["weba"],
            "audio/xm": ["xm"],
            "font/collection": ["ttc"],
            "font/otf": ["otf"],
            "font/ttf": ["ttf"],
            "font/woff": ["woff"],
            "font/woff2": ["woff2"],
            "image/aces": ["exr"],
            "image/apng": ["apng"],
            "image/avif": ["avif"],
            "image/bmp": ["bmp"],
            "image/cgm": ["cgm"],
            "image/dicom-rle": ["drle"],
            "image/emf": ["emf"],
            "image/fits": ["fits"],
            "image/g3fax": ["g3"],
            "image/gif": ["gif"],
            "image/heic": ["heic"],
            "image/heic-sequence": ["heics"],
            "image/heif": ["heif"],
            "image/heif-sequence": ["heifs"],
            "image/hej2k": ["hej2"],
            "image/hsj2": ["hsj2"],
            "image/ief": ["ief"],
            "image/jls": ["jls"],
            "image/jp2": ["jp2", "jpg2"],
            "image/jpeg": ["jpeg", "jpg", "jpe"],
            "image/jph": ["jph"],
            "image/jphc": ["jhc"],
            "image/jpm": ["jpm"],
            "image/jpx": ["jpx", "jpf"],
            "image/jxr": ["jxr"],
            "image/jxra": ["jxra"],
            "image/jxrs": ["jxrs"],
            "image/jxs": ["jxs"],
            "image/jxsc": ["jxsc"],
            "image/jxsi": ["jxsi"],
            "image/jxss": ["jxss"],
            "image/ktx": ["ktx"],
            "image/ktx2": ["ktx2"],
            "image/png": ["png"],
            "image/sgi": ["sgi"],
            "image/svg+xml": ["svg", "svgz"],
            "image/t38": ["t38"],
            "image/tiff": ["tif", "tiff"],
            "image/tiff-fx": ["tfx"],
            "image/webp": ["webp"],
            "image/wmf": ["wmf"],
            "message/disposition-notification": ["disposition-notification"],
            "message/global": ["u8msg"],
            "message/global-delivery-status": ["u8dsn"],
            "message/global-disposition-notification": ["u8mdn"],
            "message/global-headers": ["u8hdr"],
            "message/rfc822": ["eml", "mime"],
            "model/3mf": ["3mf"],
            "model/gltf+json": ["gltf"],
            "model/gltf-binary": ["glb"],
            "model/iges": ["igs", "iges"],
            "model/mesh": ["msh", "mesh", "silo"],
            "model/mtl": ["mtl"],
            "model/obj": ["obj"],
            "model/step+xml": ["stpx"],
            "model/step+zip": ["stpz"],
            "model/step-xml+zip": ["stpxz"],
            "model/stl": ["stl"],
            "model/vrml": ["wrl", "vrml"],
            "model/x3d+binary": ["*x3db", "x3dbz"],
            "model/x3d+fastinfoset": ["x3db"],
            "model/x3d+vrml": ["*x3dv", "x3dvz"],
            "model/x3d+xml": ["x3d", "x3dz"],
            "model/x3d-vrml": ["x3dv"],
            "text/cache-manifest": ["appcache", "manifest"],
            "text/calendar": ["ics", "ifb"],
            "text/coffeescript": ["coffee", "litcoffee"],
            "text/css": ["css"],
            "text/csv": ["csv"],
            "text/html": ["html", "htm", "shtml"],
            "text/jade": ["jade"],
            "text/jsx": ["jsx"],
            "text/less": ["less"],
            "text/markdown": ["markdown", "md"],
            "text/mathml": ["mml"],
            "text/mdx": ["mdx"],
            "text/n3": ["n3"],
            "text/plain": [
              "txt",
              "text",
              "conf",
              "def",
              "list",
              "log",
              "in",
              "ini",
            ],
            "text/richtext": ["rtx"],
            "text/rtf": ["*rtf"],
            "text/sgml": ["sgml", "sgm"],
            "text/shex": ["shex"],
            "text/slim": ["slim", "slm"],
            "text/spdx": ["spdx"],
            "text/stylus": ["stylus", "styl"],
            "text/tab-separated-values": ["tsv"],
            "text/troff": ["t", "tr", "roff", "man", "me", "ms"],
            "text/turtle": ["ttl"],
            "text/uri-list": ["uri", "uris", "urls"],
            "text/vcard": ["vcard"],
            "text/vtt": ["vtt"],
            "text/xml": ["*xml"],
            "text/yaml": ["yaml", "yml"],
            "video/3gpp": ["3gp", "3gpp"],
            "video/3gpp2": ["3g2"],
            "video/h261": ["h261"],
            "video/h263": ["h263"],
            "video/h264": ["h264"],
            "video/iso.segment": ["m4s"],
            "video/jpeg": ["jpgv"],
            "video/jpm": ["*jpm", "jpgm"],
            "video/mj2": ["mj2", "mjp2"],
            "video/mp2t": ["ts"],
            "video/mp4": ["mp4", "mp4v", "mpg4"],
            "video/mpeg": ["mpeg", "mpg", "mpe", "m1v", "m2v"],
            "video/ogg": ["ogv"],
            "video/quicktime": ["qt", "mov"],
            "video/webm": ["webm"],
          };
        },
        {},
      ],
      21: [
        function (require, module, exports) {
          (function (Buffer) {
            (function () {
              // This is an intentionally recursive require. I don't like it either.
              var Box = require("./index");
              var Descriptor = require("./descriptor");
              var uint64be = require("uint64be");

              var TIME_OFFSET = 2082844800000;

              /*
TODO:
test these
add new box versions
*/

              // These have 'version' and 'flags' fields in the headers
              exports.fullBoxes = {};
              var fullBoxes = [
                "mvhd",
                "tkhd",
                "mdhd",
                "vmhd",
                "smhd",
                "stsd",
                "esds",
                "stsz",
                "stco",
                "co64",
                "stss",
                "stts",
                "ctts",
                "stsc",
                "dref",
                "elst",
                "hdlr",
                "mehd",
                "trex",
                "mfhd",
                "tfhd",
                "tfdt",
                "trun",
              ];
              fullBoxes.forEach(function (type) {
                exports.fullBoxes[type] = true;
              });

              exports.ftyp = {};
              exports.ftyp.encode = function (box, buf, offset) {
                buf = buf
                  ? buf.slice(offset)
                  : Buffer.alloc(exports.ftyp.encodingLength(box));
                var brands = box.compatibleBrands || [];
                buf.write(box.brand, 0, 4, "ascii");
                buf.writeUInt32BE(box.brandVersion, 4);
                for (var i = 0; i < brands.length; i++)
                  buf.write(brands[i], 8 + i * 4, 4, "ascii");
                exports.ftyp.encode.bytes = 8 + brands.length * 4;
                return buf;
              };
              exports.ftyp.decode = function (buf, offset) {
                buf = buf.slice(offset);
                var brand = buf.toString("ascii", 0, 4);
                var version = buf.readUInt32BE(4);
                var compatibleBrands = [];
                for (var i = 8; i < buf.length; i += 4)
                  compatibleBrands.push(buf.toString("ascii", i, i + 4));
                return {
                  brand: brand,
                  brandVersion: version,
                  compatibleBrands: compatibleBrands,
                };
              };
              exports.ftyp.encodingLength = function (box) {
                return 8 + (box.compatibleBrands || []).length * 4;
              };

              exports.mvhd = {};
              exports.mvhd.encode = function (box, buf, offset) {
                buf = buf ? buf.slice(offset) : Buffer.alloc(96);
                writeDate(box.ctime || new Date(), buf, 0);
                writeDate(box.mtime || new Date(), buf, 4);
                buf.writeUInt32BE(box.timeScale || 0, 8);
                buf.writeUInt32BE(box.duration || 0, 12);
                writeFixed32(box.preferredRate || 0, buf, 16);
                writeFixed16(box.preferredVolume || 0, buf, 20);
                writeReserved(buf, 22, 32);
                writeMatrix(box.matrix, buf, 32);
                buf.writeUInt32BE(box.previewTime || 0, 68);
                buf.writeUInt32BE(box.previewDuration || 0, 72);
                buf.writeUInt32BE(box.posterTime || 0, 76);
                buf.writeUInt32BE(box.selectionTime || 0, 80);
                buf.writeUInt32BE(box.selectionDuration || 0, 84);
                buf.writeUInt32BE(box.currentTime || 0, 88);
                buf.writeUInt32BE(box.nextTrackId || 0, 92);
                exports.mvhd.encode.bytes = 96;
                return buf;
              };
              exports.mvhd.decode = function (buf, offset) {
                buf = buf.slice(offset);
                return {
                  ctime: readDate(buf, 0),
                  mtime: readDate(buf, 4),
                  timeScale: buf.readUInt32BE(8),
                  duration: buf.readUInt32BE(12),
                  preferredRate: readFixed32(buf, 16),
                  preferredVolume: readFixed16(buf, 20),
                  matrix: readMatrix(buf.slice(32, 68)),
                  previewTime: buf.readUInt32BE(68),
                  previewDuration: buf.readUInt32BE(72),
                  posterTime: buf.readUInt32BE(76),
                  selectionTime: buf.readUInt32BE(80),
                  selectionDuration: buf.readUInt32BE(84),
                  currentTime: buf.readUInt32BE(88),
                  nextTrackId: buf.readUInt32BE(92),
                };
              };
              exports.mvhd.encodingLength = function (box) {
                return 96;
              };

              exports.tkhd = {};
              exports.tkhd.encode = function (box, buf, offset) {
                buf = buf ? buf.slice(offset) : Buffer.alloc(80);
                writeDate(box.ctime || new Date(), buf, 0);
                writeDate(box.mtime || new Date(), buf, 4);
                buf.writeUInt32BE(box.trackId || 0, 8);
                writeReserved(buf, 12, 16);
                buf.writeUInt32BE(box.duration || 0, 16);
                writeReserved(buf, 20, 28);
                buf.writeUInt16BE(box.layer || 0, 28);
                buf.writeUInt16BE(box.alternateGroup || 0, 30);
                buf.writeUInt16BE(box.volume || 0, 32);
                writeMatrix(box.matrix, buf, 36);
                buf.writeUInt32BE(box.trackWidth || 0, 72);
                buf.writeUInt32BE(box.trackHeight || 0, 76);
                exports.tkhd.encode.bytes = 80;
                return buf;
              };
              exports.tkhd.decode = function (buf, offset) {
                buf = buf.slice(offset);
                return {
                  ctime: readDate(buf, 0),
                  mtime: readDate(buf, 4),
                  trackId: buf.readUInt32BE(8),
                  duration: buf.readUInt32BE(16),
                  layer: buf.readUInt16BE(28),
                  alternateGroup: buf.readUInt16BE(30),
                  volume: buf.readUInt16BE(32),
                  matrix: readMatrix(buf.slice(36, 72)),
                  trackWidth: buf.readUInt32BE(72),
                  trackHeight: buf.readUInt32BE(76),
                };
              };
              exports.tkhd.encodingLength = function (box) {
                return 80;
              };

              exports.mdhd = {};
              exports.mdhd.encode = function (box, buf, offset) {
                if (box.version === 1) {
                  buf = buf ? buf.slice(offset) : Buffer.alloc(32);
                  writeDate64(box.ctime || new Date(), buf, 0);
                  writeDate64(box.mtime || new Date(), buf, 8);
                  buf.writeUInt32BE(box.timeScale || 0, 16);
                  // Node only supports integer <= 48bit. Waiting for BigInt!
                  buf.writeUIntBE(box.duration || 0, 20, 6);
                  buf.writeUInt16BE(box.language || 0, 28);
                  buf.writeUInt16BE(box.quality || 0, 30);
                  exports.mdhd.encode.bytes = 32;
                  return buf;
                }

                buf = buf ? buf.slice(offset) : Buffer.alloc(20);
                writeDate(box.ctime || new Date(), buf, 0);
                writeDate(box.mtime || new Date(), buf, 4);
                buf.writeUInt32BE(box.timeScale || 0, 8);
                buf.writeUInt32BE(box.duration || 0, 12);
                buf.writeUInt16BE(box.language || 0, 16);
                buf.writeUInt16BE(box.quality || 0, 18);
                exports.mdhd.encode.bytes = 20;
                return buf;
              };

              exports.mdhd.decode = function (buf, offset, end) {
                buf = buf.slice(offset);

                var version1 = end - offset !== 20;

                // In version 1 creation time and modification time are unsigned long
                if (version1) {
                  return {
                    ctime: readDate64(buf, 0),
                    mtime: readDate64(buf, 8),
                    timeScale: buf.readUInt32BE(16),
                    // Node only supports integer <= 48bit. Waiting for BigInt!
                    duration: buf.readUIntBE(20, 6),
                    language: buf.readUInt16BE(28),
                    quality: buf.readUInt16BE(30),
                  };
                }

                return {
                  ctime: readDate(buf, 0),
                  mtime: readDate(buf, 4),
                  timeScale: buf.readUInt32BE(8),
                  duration: buf.readUInt32BE(12),
                  language: buf.readUInt16BE(16),
                  quality: buf.readUInt16BE(18),
                };
              };
              exports.mdhd.encodingLength = function (box) {
                if (box.version === 1) return 32;

                return 20;
              };

              exports.vmhd = {};
              exports.vmhd.encode = function (box, buf, offset) {
                buf = buf ? buf.slice(offset) : Buffer.alloc(8);
                buf.writeUInt16BE(box.graphicsMode || 0, 0);
                var opcolor = box.opcolor || [0, 0, 0];
                buf.writeUInt16BE(opcolor[0], 2);
                buf.writeUInt16BE(opcolor[1], 4);
                buf.writeUInt16BE(opcolor[2], 6);
                exports.vmhd.encode.bytes = 8;
                return buf;
              };
              exports.vmhd.decode = function (buf, offset) {
                buf = buf.slice(offset);
                return {
                  graphicsMode: buf.readUInt16BE(0),
                  opcolor: [
                    buf.readUInt16BE(2),
                    buf.readUInt16BE(4),
                    buf.readUInt16BE(6),
                  ],
                };
              };
              exports.vmhd.encodingLength = function (box) {
                return 8;
              };

              exports.smhd = {};
              exports.smhd.encode = function (box, buf, offset) {
                buf = buf ? buf.slice(offset) : Buffer.alloc(4);
                buf.writeUInt16BE(box.balance || 0, 0);
                writeReserved(buf, 2, 4);
                exports.smhd.encode.bytes = 4;
                return buf;
              };
              exports.smhd.decode = function (buf, offset) {
                buf = buf.slice(offset);
                return {
                  balance: buf.readUInt16BE(0),
                };
              };
              exports.smhd.encodingLength = function (box) {
                return 4;
              };

              exports.stsd = {};
              exports.stsd.encode = function (box, buf, offset) {
                buf = buf
                  ? buf.slice(offset)
                  : Buffer.alloc(exports.stsd.encodingLength(box));
                var entries = box.entries || [];

                buf.writeUInt32BE(entries.length, 0);

                var ptr = 4;
                for (var i = 0; i < entries.length; i++) {
                  var entry = entries[i];
                  Box.encode(entry, buf, ptr);
                  ptr += Box.encode.bytes;
                }

                exports.stsd.encode.bytes = ptr;
                return buf;
              };
              exports.stsd.decode = function (buf, offset, end) {
                buf = buf.slice(offset);
                var num = buf.readUInt32BE(0);
                var entries = new Array(num);
                var ptr = 4;

                for (var i = 0; i < num; i++) {
                  var entry = Box.decode(buf, ptr, end);
                  entries[i] = entry;
                  ptr += entry.length;
                }

                return {
                  entries: entries,
                };
              };
              exports.stsd.encodingLength = function (box) {
                var totalSize = 4;
                if (!box.entries) return totalSize;
                for (var i = 0; i < box.entries.length; i++) {
                  totalSize += Box.encodingLength(box.entries[i]);
                }
                return totalSize;
              };

              exports.avc1 = exports.VisualSampleEntry = {};
              exports.VisualSampleEntry.encode = function (box, buf, offset) {
                buf = buf
                  ? buf.slice(offset)
                  : Buffer.alloc(exports.VisualSampleEntry.encodingLength(box));

                writeReserved(buf, 0, 6);
                buf.writeUInt16BE(box.dataReferenceIndex || 0, 6);
                writeReserved(buf, 8, 24);
                buf.writeUInt16BE(box.width || 0, 24);
                buf.writeUInt16BE(box.height || 0, 26);
                buf.writeUInt32BE(box.hResolution || 0x480000, 28);
                buf.writeUInt32BE(box.vResolution || 0x480000, 32);
                writeReserved(buf, 36, 40);
                buf.writeUInt16BE(box.frameCount || 1, 40);
                var compressorName = box.compressorName || "";
                var nameLen = Math.min(compressorName.length, 31);
                buf.writeUInt8(nameLen, 42);
                buf.write(compressorName, 43, nameLen, "utf8");
                buf.writeUInt16BE(box.depth || 0x18, 74);
                buf.writeInt16BE(-1, 76);

                var ptr = 78;
                var children = box.children || [];
                children.forEach(function (child) {
                  Box.encode(child, buf, ptr);
                  ptr += Box.encode.bytes;
                });
                exports.VisualSampleEntry.encode.bytes = ptr;
              };
              exports.VisualSampleEntry.decode = function (buf, offset, end) {
                buf = buf.slice(offset);
                var length = end - offset;
                var nameLen = Math.min(buf.readUInt8(42), 31);
                var box = {
                  dataReferenceIndex: buf.readUInt16BE(6),
                  width: buf.readUInt16BE(24),
                  height: buf.readUInt16BE(26),
                  hResolution: buf.readUInt32BE(28),
                  vResolution: buf.readUInt32BE(32),
                  frameCount: buf.readUInt16BE(40),
                  compressorName: buf.toString("utf8", 43, 43 + nameLen),
                  depth: buf.readUInt16BE(74),
                  children: [],
                };

                var ptr = 78;
                while (length - ptr >= 8) {
                  var child = Box.decode(buf, ptr, length);
                  box.children.push(child);
                  box[child.type] = child;
                  ptr += child.length;
                }

                return box;
              };
              exports.VisualSampleEntry.encodingLength = function (box) {
                var len = 78;
                var children = box.children || [];
                children.forEach(function (child) {
                  len += Box.encodingLength(child);
                });
                return len;
              };

              exports.avcC = {};
              exports.avcC.encode = function (box, buf, offset) {
                buf = buf ? buf.slice(offset) : Buffer.alloc(box.buffer.length);

                box.buffer.copy(buf);
                exports.avcC.encode.bytes = box.buffer.length;
              };
              exports.avcC.decode = function (buf, offset, end) {
                buf = buf.slice(offset, end);

                return {
                  mimeCodec: buf.toString("hex", 1, 4),
                  buffer: Buffer.from(buf),
                };
              };
              exports.avcC.encodingLength = function (box) {
                return box.buffer.length;
              };

              exports.mp4a = exports.AudioSampleEntry = {};
              exports.AudioSampleEntry.encode = function (box, buf, offset) {
                buf = buf
                  ? buf.slice(offset)
                  : Buffer.alloc(exports.AudioSampleEntry.encodingLength(box));

                writeReserved(buf, 0, 6);
                buf.writeUInt16BE(box.dataReferenceIndex || 0, 6);
                writeReserved(buf, 8, 16);
                buf.writeUInt16BE(box.channelCount || 2, 16);
                buf.writeUInt16BE(box.sampleSize || 16, 18);
                writeReserved(buf, 20, 24);
                buf.writeUInt32BE(box.sampleRate || 0, 24);

                var ptr = 28;
                var children = box.children || [];
                children.forEach(function (child) {
                  Box.encode(child, buf, ptr);
                  ptr += Box.encode.bytes;
                });
                exports.AudioSampleEntry.encode.bytes = ptr;
              };
              exports.AudioSampleEntry.decode = function (buf, offset, end) {
                buf = buf.slice(offset, end);
                var length = end - offset;
                var box = {
                  dataReferenceIndex: buf.readUInt16BE(6),
                  channelCount: buf.readUInt16BE(16),
                  sampleSize: buf.readUInt16BE(18),
                  sampleRate: buf.readUInt32BE(24),
                  children: [],
                };

                var ptr = 28;
                while (length - ptr >= 8) {
                  var child = Box.decode(buf, ptr, length);
                  box.children.push(child);
                  box[child.type] = child;
                  ptr += child.length;
                }

                return box;
              };
              exports.AudioSampleEntry.encodingLength = function (box) {
                var len = 28;
                var children = box.children || [];
                children.forEach(function (child) {
                  len += Box.encodingLength(child);
                });
                return len;
              };

              exports.esds = {};
              exports.esds.encode = function (box, buf, offset) {
                buf = buf ? buf.slice(offset) : Buffer.alloc(box.buffer.length);

                box.buffer.copy(buf, 0);
                exports.esds.encode.bytes = box.buffer.length;
              };
              exports.esds.decode = function (buf, offset, end) {
                buf = buf.slice(offset, end);

                var desc = Descriptor.Descriptor.decode(buf, 0, buf.length);
                var esd = desc.tagName === "ESDescriptor" ? desc : {};
                var dcd = esd.DecoderConfigDescriptor || {};
                var oti = dcd.oti || 0;
                var dsi = dcd.DecoderSpecificInfo;
                var audioConfig = dsi
                  ? (dsi.buffer.readUInt8(0) & 0xf8) >> 3
                  : 0;

                var mimeCodec = null;
                if (oti) {
                  mimeCodec = oti.toString(16);
                  if (audioConfig) {
                    mimeCodec += "." + audioConfig;
                  }
                }

                return {
                  mimeCodec: mimeCodec,
                  buffer: Buffer.from(buf.slice(0)),
                };
              };
              exports.esds.encodingLength = function (box) {
                return box.buffer.length;
              };

              // TODO: integrate the two versions in a saner way
              exports.stsz = {};
              exports.stsz.encode = function (box, buf, offset) {
                var entries = box.entries || [];
                buf = buf
                  ? buf.slice(offset)
                  : Buffer.alloc(exports.stsz.encodingLength(box));

                buf.writeUInt32BE(0, 0);
                buf.writeUInt32BE(entries.length, 4);

                for (var i = 0; i < entries.length; i++) {
                  buf.writeUInt32BE(entries[i], i * 4 + 8);
                }

                exports.stsz.encode.bytes = 8 + entries.length * 4;
                return buf;
              };
              exports.stsz.decode = function (buf, offset) {
                buf = buf.slice(offset);
                var size = buf.readUInt32BE(0);
                var num = buf.readUInt32BE(4);
                var entries = new Array(num);

                for (var i = 0; i < num; i++) {
                  if (size === 0) {
                    entries[i] = buf.readUInt32BE(i * 4 + 8);
                  } else {
                    entries[i] = size;
                  }
                }

                return {
                  entries: entries,
                };
              };
              exports.stsz.encodingLength = function (box) {
                return 8 + box.entries.length * 4;
              };

              exports.stss = exports.stco = {};
              exports.stco.encode = function (box, buf, offset) {
                var entries = box.entries || [];
                buf = buf
                  ? buf.slice(offset)
                  : Buffer.alloc(exports.stco.encodingLength(box));

                buf.writeUInt32BE(entries.length, 0);

                for (var i = 0; i < entries.length; i++) {
                  buf.writeUInt32BE(entries[i], i * 4 + 4);
                }

                exports.stco.encode.bytes = 4 + entries.length * 4;
                return buf;
              };
              exports.stco.decode = function (buf, offset) {
                buf = buf.slice(offset);
                var num = buf.readUInt32BE(0);
                var entries = new Array(num);

                for (var i = 0; i < num; i++) {
                  entries[i] = buf.readUInt32BE(i * 4 + 4);
                }

                return {
                  entries: entries,
                };
              };
              exports.stco.encodingLength = function (box) {
                return 4 + box.entries.length * 4;
              };

              exports.co64 = {};
              exports.co64.encode = function (box, buf, offset) {
                var entries = box.entries || [];
                buf = buf
                  ? buf.slice(offset)
                  : Buffer.alloc(exports.co64.encodingLength(box));

                buf.writeUInt32BE(entries.length, 0);

                for (var i = 0; i < entries.length; i++) {
                  uint64be.encode(entries[i], buf, i * 8 + 4);
                }

                exports.co64.encode.bytes = 4 + entries.length * 8;
                return buf;
              };
              exports.co64.decode = function (buf, offset) {
                buf = buf.slice(offset);
                var num = buf.readUInt32BE(0);
                var entries = new Array(num);

                for (var i = 0; i < num; i++) {
                  entries[i] = uint64be.decode(buf, i * 8 + 4);
                }

                return {
                  entries: entries,
                };
              };
              exports.co64.encodingLength = function (box) {
                return 4 + box.entries.length * 8;
              };

              exports.stts = {};
              exports.stts.encode = function (box, buf, offset) {
                var entries = box.entries || [];
                buf = buf
                  ? buf.slice(offset)
                  : Buffer.alloc(exports.stts.encodingLength(box));

                buf.writeUInt32BE(entries.length, 0);

                for (var i = 0; i < entries.length; i++) {
                  var ptr = i * 8 + 4;
                  buf.writeUInt32BE(entries[i].count || 0, ptr);
                  buf.writeUInt32BE(entries[i].duration || 0, ptr + 4);
                }

                exports.stts.encode.bytes = 4 + box.entries.length * 8;
                return buf;
              };
              exports.stts.decode = function (buf, offset) {
                buf = buf.slice(offset);
                var num = buf.readUInt32BE(0);
                var entries = new Array(num);

                for (var i = 0; i < num; i++) {
                  var ptr = i * 8 + 4;
                  entries[i] = {
                    count: buf.readUInt32BE(ptr),
                    duration: buf.readUInt32BE(ptr + 4),
                  };
                }

                return {
                  entries: entries,
                };
              };
              exports.stts.encodingLength = function (box) {
                return 4 + box.entries.length * 8;
              };

              exports.ctts = {};
              exports.ctts.encode = function (box, buf, offset) {
                var entries = box.entries || [];
                buf = buf
                  ? buf.slice(offset)
                  : Buffer.alloc(exports.ctts.encodingLength(box));

                buf.writeUInt32BE(entries.length, 0);

                for (var i = 0; i < entries.length; i++) {
                  var ptr = i * 8 + 4;
                  buf.writeUInt32BE(entries[i].count || 0, ptr);
                  buf.writeUInt32BE(entries[i].compositionOffset || 0, ptr + 4);
                }

                exports.ctts.encode.bytes = 4 + entries.length * 8;
                return buf;
              };
              exports.ctts.decode = function (buf, offset) {
                buf = buf.slice(offset);
                var num = buf.readUInt32BE(0);
                var entries = new Array(num);

                for (var i = 0; i < num; i++) {
                  var ptr = i * 8 + 4;
                  entries[i] = {
                    count: buf.readUInt32BE(ptr),
                    compositionOffset: buf.readInt32BE(ptr + 4),
                  };
                }

                return {
                  entries: entries,
                };
              };
              exports.ctts.encodingLength = function (box) {
                return 4 + box.entries.length * 8;
              };

              exports.stsc = {};
              exports.stsc.encode = function (box, buf, offset) {
                var entries = box.entries || [];
                buf = buf
                  ? buf.slice(offset)
                  : Buffer.alloc(exports.stsc.encodingLength(box));

                buf.writeUInt32BE(entries.length, 0);

                for (var i = 0; i < entries.length; i++) {
                  var ptr = i * 12 + 4;
                  buf.writeUInt32BE(entries[i].firstChunk || 0, ptr);
                  buf.writeUInt32BE(entries[i].samplesPerChunk || 0, ptr + 4);
                  buf.writeUInt32BE(
                    entries[i].sampleDescriptionId || 0,
                    ptr + 8
                  );
                }

                exports.stsc.encode.bytes = 4 + entries.length * 12;
                return buf;
              };
              exports.stsc.decode = function (buf, offset) {
                buf = buf.slice(offset);
                var num = buf.readUInt32BE(0);
                var entries = new Array(num);

                for (var i = 0; i < num; i++) {
                  var ptr = i * 12 + 4;
                  entries[i] = {
                    firstChunk: buf.readUInt32BE(ptr),
                    samplesPerChunk: buf.readUInt32BE(ptr + 4),
                    sampleDescriptionId: buf.readUInt32BE(ptr + 8),
                  };
                }

                return {
                  entries: entries,
                };
              };
              exports.stsc.encodingLength = function (box) {
                return 4 + box.entries.length * 12;
              };

              exports.dref = {};
              exports.dref.encode = function (box, buf, offset) {
                buf = buf
                  ? buf.slice(offset)
                  : Buffer.alloc(exports.dref.encodingLength(box));
                var entries = box.entries || [];

                buf.writeUInt32BE(entries.length, 0);

                var ptr = 4;
                for (var i = 0; i < entries.length; i++) {
                  var entry = entries[i];
                  var size = (entry.buf ? entry.buf.length : 0) + 4 + 4;

                  buf.writeUInt32BE(size, ptr);
                  ptr += 4;

                  buf.write(entry.type, ptr, 4, "ascii");
                  ptr += 4;

                  if (entry.buf) {
                    entry.buf.copy(buf, ptr);
                    ptr += entry.buf.length;
                  }
                }

                exports.dref.encode.bytes = ptr;
                return buf;
              };
              exports.dref.decode = function (buf, offset) {
                buf = buf.slice(offset);
                var num = buf.readUInt32BE(0);
                var entries = new Array(num);
                var ptr = 4;

                for (var i = 0; i < num; i++) {
                  var size = buf.readUInt32BE(ptr);
                  var type = buf.toString("ascii", ptr + 4, ptr + 8);
                  var tmp = buf.slice(ptr + 8, ptr + size);
                  ptr += size;

                  entries[i] = {
                    type: type,
                    buf: tmp,
                  };
                }

                return {
                  entries: entries,
                };
              };
              exports.dref.encodingLength = function (box) {
                var totalSize = 4;
                if (!box.entries) return totalSize;
                for (var i = 0; i < box.entries.length; i++) {
                  var buf = box.entries[i].buf;
                  totalSize += (buf ? buf.length : 0) + 4 + 4;
                }
                return totalSize;
              };

              exports.elst = {};
              exports.elst.encode = function (box, buf, offset) {
                var entries = box.entries || [];
                buf = buf
                  ? buf.slice(offset)
                  : Buffer.alloc(exports.elst.encodingLength(box));

                buf.writeUInt32BE(entries.length, 0);

                for (var i = 0; i < entries.length; i++) {
                  var ptr = i * 12 + 4;
                  buf.writeUInt32BE(entries[i].trackDuration || 0, ptr);
                  buf.writeUInt32BE(entries[i].mediaTime || 0, ptr + 4);
                  writeFixed32(entries[i].mediaRate || 0, buf, ptr + 8);
                }

                exports.elst.encode.bytes = 4 + entries.length * 12;
                return buf;
              };
              exports.elst.decode = function (buf, offset) {
                buf = buf.slice(offset);
                var num = buf.readUInt32BE(0);
                var entries = new Array(num);

                for (var i = 0; i < num; i++) {
                  var ptr = i * 12 + 4;
                  entries[i] = {
                    trackDuration: buf.readUInt32BE(ptr),
                    mediaTime: buf.readInt32BE(ptr + 4),
                    mediaRate: readFixed32(buf, ptr + 8),
                  };
                }

                return {
                  entries: entries,
                };
              };
              exports.elst.encodingLength = function (box) {
                return 4 + box.entries.length * 12;
              };

              exports.hdlr = {};
              exports.hdlr.encode = function (box, buf, offset) {
                buf = buf
                  ? buf.slice(offset)
                  : Buffer.alloc(exports.hdlr.encodingLength(box));

                var len = 21 + (box.name || "").length;
                buf.fill(0, 0, len);

                buf.write(box.handlerType || "", 4, 4, "ascii");
                writeString(box.name || "", buf, 20);

                exports.hdlr.encode.bytes = len;
                return buf;
              };
              exports.hdlr.decode = function (buf, offset, end) {
                buf = buf.slice(offset);
                return {
                  handlerType: buf.toString("ascii", 4, 8),
                  name: readString(buf, 20, end),
                };
              };
              exports.hdlr.encodingLength = function (box) {
                return 21 + (box.name || "").length;
              };

              exports.mehd = {};
              exports.mehd.encode = function (box, buf, offset) {
                buf = buf ? buf.slice(offset) : Buffer.alloc(4);

                buf.writeUInt32BE(box.fragmentDuration || 0, 0);
                exports.mehd.encode.bytes = 4;
                return buf;
              };
              exports.mehd.decode = function (buf, offset) {
                buf = buf.slice(offset);
                return {
                  fragmentDuration: buf.readUInt32BE(0),
                };
              };
              exports.mehd.encodingLength = function (box) {
                return 4;
              };

              exports.trex = {};
              exports.trex.encode = function (box, buf, offset) {
                buf = buf ? buf.slice(offset) : Buffer.alloc(20);

                buf.writeUInt32BE(box.trackId || 0, 0);
                buf.writeUInt32BE(box.defaultSampleDescriptionIndex || 0, 4);
                buf.writeUInt32BE(box.defaultSampleDuration || 0, 8);
                buf.writeUInt32BE(box.defaultSampleSize || 0, 12);
                buf.writeUInt32BE(box.defaultSampleFlags || 0, 16);
                exports.trex.encode.bytes = 20;
                return buf;
              };
              exports.trex.decode = function (buf, offset) {
                buf = buf.slice(offset);
                return {
                  trackId: buf.readUInt32BE(0),
                  defaultSampleDescriptionIndex: buf.readUInt32BE(4),
                  defaultSampleDuration: buf.readUInt32BE(8),
                  defaultSampleSize: buf.readUInt32BE(12),
                  defaultSampleFlags: buf.readUInt32BE(16),
                };
              };
              exports.trex.encodingLength = function (box) {
                return 20;
              };

              exports.mfhd = {};
              exports.mfhd.encode = function (box, buf, offset) {
                buf = buf ? buf.slice(offset) : Buffer.alloc(4);

                buf.writeUInt32BE(box.sequenceNumber || 0, 0);
                exports.mfhd.encode.bytes = 4;
                return buf;
              };
              exports.mfhd.decode = function (buf, offset) {
                return {
                  sequenceNumber: buf.readUInt32BE(0),
                };
              };
              exports.mfhd.encodingLength = function (box) {
                return 4;
              };

              exports.tfhd = {};
              exports.tfhd.encode = function (box, buf, offset) {
                buf = buf ? buf.slice(offset) : Buffer.alloc(4);
                buf.writeUInt32BE(box.trackId, 0);
                exports.tfhd.encode.bytes = 4;
                return buf;
              };
              exports.tfhd.decode = function (buf, offset) {
                // TODO: this
              };
              exports.tfhd.encodingLength = function (box) {
                // TODO: this is wrong!
                return 4;
              };

              exports.tfdt = {};
              exports.tfdt.encode = function (box, buf, offset) {
                buf = buf ? buf.slice(offset) : Buffer.alloc(4);

                buf.writeUInt32BE(box.baseMediaDecodeTime || 0, 0);
                exports.tfdt.encode.bytes = 4;
                return buf;
              };
              exports.tfdt.decode = function (buf, offset) {
                // TODO: this
              };
              exports.tfdt.encodingLength = function (box) {
                return 4;
              };

              exports.trun = {};
              exports.trun.encode = function (box, buf, offset) {
                buf = buf
                  ? buf.slice(offset)
                  : Buffer.alloc(8 + box.entries.length * 16);

                // TODO: this is wrong
                buf.writeUInt32BE(box.entries.length, 0);
                buf.writeInt32BE(box.dataOffset, 4);
                var ptr = 8;
                for (var i = 0; i < box.entries.length; i++) {
                  var entry = box.entries[i];
                  buf.writeUInt32BE(entry.sampleDuration, ptr);
                  ptr += 4;

                  buf.writeUInt32BE(entry.sampleSize, ptr);
                  ptr += 4;

                  buf.writeUInt32BE(entry.sampleFlags, ptr);
                  ptr += 4;

                  if ((box.version || 0) === 0) {
                    buf.writeUInt32BE(entry.sampleCompositionTimeOffset, ptr);
                  } else {
                    buf.writeInt32BE(entry.sampleCompositionTimeOffset, ptr);
                  }
                  ptr += 4;
                }
                exports.trun.encode.bytes = ptr;
              };
              exports.trun.decode = function (buf, offset) {
                // TODO: this
              };
              exports.trun.encodingLength = function (box) {
                // TODO: this is wrong
                return 8 + box.entries.length * 16;
              };

              exports.mdat = {};
              exports.mdat.encode = function (box, buf, offset) {
                if (box.buffer) {
                  box.buffer.copy(buf, offset);
                  exports.mdat.encode.bytes = box.buffer.length;
                } else {
                  exports.mdat.encode.bytes = exports.mdat.encodingLength(box);
                }
              };
              exports.mdat.decode = function (buf, start, end) {
                return {
                  buffer: Buffer.from(buf.slice(start, end)),
                };
              };
              exports.mdat.encodingLength = function (box) {
                return box.buffer ? box.buffer.length : box.contentLength;
              };

              function writeReserved(buf, offset, end) {
                for (var i = offset; i < end; i++) buf[i] = 0;
              }

              function writeDate(date, buf, offset) {
                buf.writeUInt32BE(
                  Math.floor((date.getTime() + TIME_OFFSET) / 1000),
                  offset
                );
              }

              function writeDate64(date, buf, offset) {
                // Node only supports integer <= 48bit. Waiting for BigInt!
                buf.writeUIntBE(
                  Math.floor((date.getTime() + TIME_OFFSET) / 1000),
                  offset,
                  6
                );
              }

              // TODO: think something is wrong here
              function writeFixed32(num, buf, offset) {
                buf.writeUInt16BE(Math.floor(num) % (256 * 256), offset);
                buf.writeUInt16BE(
                  Math.floor(num * 256 * 256) % (256 * 256),
                  offset + 2
                );
              }

              function writeFixed16(num, buf, offset) {
                buf[offset] = Math.floor(num) % 256;
                buf[offset + 1] = Math.floor(num * 256) % 256;
              }

              function writeMatrix(list, buf, offset) {
                if (!list) list = [0, 0, 0, 0, 0, 0, 0, 0, 0];
                for (var i = 0; i < list.length; i++) {
                  writeFixed32(list[i], buf, offset + i * 4);
                }
              }

              function writeString(str, buf, offset) {
                var strBuffer = Buffer.from(str, "utf8");
                strBuffer.copy(buf, offset);
                buf[offset + strBuffer.length] = 0;
              }

              function readMatrix(buf) {
                var list = new Array(buf.length / 4);
                for (var i = 0; i < list.length; i++)
                  list[i] = readFixed32(buf, i * 4);
                return list;
              }

              function readDate64(buf, offset) {
                // Node only supports integer <= 48bit. Waiting for BigInt!
                return new Date(buf.readUIntBE(offset, 6) * 1000 - TIME_OFFSET);
              }

              function readDate(buf, offset) {
                return new Date(buf.readUInt32BE(offset) * 1000 - TIME_OFFSET);
              }

              function readFixed32(buf, offset) {
                return (
                  buf.readUInt16BE(offset) +
                  buf.readUInt16BE(offset + 2) / (256 * 256)
                );
              }

              function readFixed16(buf, offset) {
                return buf[offset] + buf[offset + 1] / 256;
              }

              function readString(buf, offset, length) {
                var i;
                for (i = 0; i < length; i++) {
                  if (buf[offset + i] === 0) {
                    break;
                  }
                }
                return buf.toString("utf8", offset, offset + i);
              }
            }.call(this));
          }.call(this, require("buffer").Buffer));
        },
        { "./descriptor": 22, "./index": 23, buffer: 7, uint64be: 59 },
      ],
      22: [
        function (require, module, exports) {
          (function (Buffer) {
            (function () {
              var tagToName = {
                0x03: "ESDescriptor",
                0x04: "DecoderConfigDescriptor",
                0x05: "DecoderSpecificInfo",
                0x06: "SLConfigDescriptor",
              };

              exports.Descriptor = {};
              exports.Descriptor.decode = function (buf, start, end) {
                var tag = buf.readUInt8(start);
                var ptr = start + 1;
                var lenByte;
                var len = 0;
                do {
                  lenByte = buf.readUInt8(ptr++);
                  len = (len << 7) | (lenByte & 0x7f);
                } while (lenByte & 0x80);

                var obj;
                var tagName = tagToName[tag]; // May be undefined; that's ok
                if (exports[tagName]) {
                  obj = exports[tagName].decode(buf, ptr, end);
                } else {
                  obj = {
                    buffer: Buffer.from(buf.slice(ptr, ptr + len)),
                  };
                }

                obj.tag = tag;
                obj.tagName = tagName;
                obj.length = ptr - start + len;
                obj.contentsLen = len;
                return obj;
              };

              exports.DescriptorArray = {};
              exports.DescriptorArray.decode = function (buf, start, end) {
                var ptr = start;
                var obj = {};
                while (ptr + 2 <= end) {
                  var descriptor = exports.Descriptor.decode(buf, ptr, end);
                  ptr += descriptor.length;
                  var tagName =
                    tagToName[descriptor.tag] || "Descriptor" + descriptor.tag;
                  obj[tagName] = descriptor;
                }
                return obj;
              };

              exports.ESDescriptor = {};
              exports.ESDescriptor.decode = function (buf, start, end) {
                var flags = buf.readUInt8(start + 2);
                var ptr = start + 3;
                if (flags & 0x80) {
                  ptr += 2;
                }
                if (flags & 0x40) {
                  var len = buf.readUInt8(ptr);
                  ptr += len + 1;
                }
                if (flags & 0x20) {
                  ptr += 2;
                }
                return exports.DescriptorArray.decode(buf, ptr, end);
              };

              exports.DecoderConfigDescriptor = {};
              exports.DecoderConfigDescriptor.decode = function (
                buf,
                start,
                end
              ) {
                var oti = buf.readUInt8(start);
                var obj = exports.DescriptorArray.decode(buf, start + 13, end);
                obj.oti = oti;
                return obj;
              };
            }.call(this));
          }.call(this, require("buffer").Buffer));
        },
        { buffer: 7 },
      ],
      23: [
        function (require, module, exports) {
          (function (Buffer) {
            (function () {
              // var assert = require('assert')
              var uint64be = require("uint64be");

              var boxes = require("./boxes");

              var UINT32_MAX = 4294967295;

              var Box = exports;

              /*
               * Lists the proper order for boxes inside containers.
               * Five-character names ending in 's' indicate arrays instead of single elements.
               */
              var containers = (exports.containers = {
                moov: ["mvhd", "meta", "traks", "mvex"],
                trak: ["tkhd", "tref", "trgr", "edts", "meta", "mdia", "udta"],
                edts: ["elst"],
                mdia: ["mdhd", "hdlr", "elng", "minf"],
                minf: ["vmhd", "smhd", "hmhd", "sthd", "nmhd", "dinf", "stbl"],
                dinf: ["dref"],
                stbl: [
                  "stsd",
                  "stts",
                  "ctts",
                  "cslg",
                  "stsc",
                  "stsz",
                  "stz2",
                  "stco",
                  "co64",
                  "stss",
                  "stsh",
                  "padb",
                  "stdp",
                  "sdtp",
                  "sbgps",
                  "sgpds",
                  "subss",
                  "saizs",
                  "saios",
                ],
                mvex: ["mehd", "trexs", "leva"],
                moof: ["mfhd", "meta", "trafs"],
                traf: [
                  "tfhd",
                  "tfdt",
                  "trun",
                  "sbgps",
                  "sgpds",
                  "subss",
                  "saizs",
                  "saios",
                  "meta",
                ],
              });

              Box.encode = function (obj, buffer, offset) {
                Box.encodingLength(obj); // sets every level appropriately
                offset = offset || 0;
                buffer = buffer || Buffer.alloc(obj.length);
                return Box._encode(obj, buffer, offset);
              };

              Box._encode = function (obj, buffer, offset) {
                var type = obj.type;
                var len = obj.length;
                if (len > UINT32_MAX) {
                  len = 1;
                }
                buffer.writeUInt32BE(len, offset);
                buffer.write(obj.type, offset + 4, 4, "ascii");
                var ptr = offset + 8;
                if (len === 1) {
                  uint64be.encode(obj.length, buffer, ptr);
                  ptr += 8;
                }
                if (boxes.fullBoxes[type]) {
                  buffer.writeUInt32BE(obj.flags || 0, ptr);
                  buffer.writeUInt8(obj.version || 0, ptr);
                  ptr += 4;
                }

                if (containers[type]) {
                  var contents = containers[type];
                  contents.forEach(function (childType) {
                    if (childType.length === 5) {
                      var entry = obj[childType] || [];
                      childType = childType.substr(0, 4);
                      entry.forEach(function (child) {
                        Box._encode(child, buffer, ptr);
                        ptr += Box.encode.bytes;
                      });
                    } else if (obj[childType]) {
                      Box._encode(obj[childType], buffer, ptr);
                      ptr += Box.encode.bytes;
                    }
                  });
                  if (obj.otherBoxes) {
                    obj.otherBoxes.forEach(function (child) {
                      Box._encode(child, buffer, ptr);
                      ptr += Box.encode.bytes;
                    });
                  }
                } else if (boxes[type]) {
                  var encode = boxes[type].encode;
                  encode(obj, buffer, ptr);
                  ptr += encode.bytes;
                } else if (obj.buffer) {
                  var buf = obj.buffer;
                  buf.copy(buffer, ptr);
                  ptr += obj.buffer.length;
                } else {
                  throw new Error(
                    "Either `type` must be set to a known type (not'" +
                      type +
                      "') or `buffer` must be set"
                  );
                }

                Box.encode.bytes = ptr - offset;
                // assert.equal(ptr - offset, obj.length, 'Error encoding \'' + type + '\': wrote ' + ptr - offset + ' bytes, expecting ' + obj.length)
                return buffer;
              };

              /*
               * Returns an object with `type` and `size` fields,
               * or if there isn't enough data, returns the total
               * number of bytes needed to read the headers
               */
              Box.readHeaders = function (buffer, start, end) {
                start = start || 0;
                end = end || buffer.length;
                if (end - start < 8) {
                  return 8;
                }

                var len = buffer.readUInt32BE(start);
                var type = buffer.toString("ascii", start + 4, start + 8);
                var ptr = start + 8;

                if (len === 1) {
                  if (end - start < 16) {
                    return 16;
                  }

                  len = uint64be.decode(buffer, ptr);
                  ptr += 8;
                }

                var version;
                var flags;
                if (boxes.fullBoxes[type]) {
                  version = buffer.readUInt8(ptr);
                  flags = buffer.readUInt32BE(ptr) & 0xffffff;
                  ptr += 4;
                }

                return {
                  length: len,
                  headersLen: ptr - start,
                  contentLen: len - (ptr - start),
                  type: type,
                  version: version,
                  flags: flags,
                };
              };

              Box.decode = function (buffer, start, end) {
                start = start || 0;
                end = end || buffer.length;
                var headers = Box.readHeaders(buffer, start, end);
                if (!headers || headers.length > end - start) {
                  throw new Error("Data too short");
                }

                return Box.decodeWithoutHeaders(
                  headers,
                  buffer,
                  start + headers.headersLen,
                  start + headers.length
                );
              };

              Box.decodeWithoutHeaders = function (
                headers,
                buffer,
                start,
                end
              ) {
                start = start || 0;
                end = end || buffer.length;
                var type = headers.type;
                var obj = {};
                if (containers[type]) {
                  obj.otherBoxes = [];
                  var contents = containers[type];
                  var ptr = start;
                  while (end - ptr >= 8) {
                    var child = Box.decode(buffer, ptr, end);
                    ptr += child.length;
                    if (contents.indexOf(child.type) >= 0) {
                      obj[child.type] = child;
                    } else if (contents.indexOf(child.type + "s") >= 0) {
                      var childType = child.type + "s";
                      var entry = (obj[childType] = obj[childType] || []);
                      entry.push(child);
                    } else {
                      obj.otherBoxes.push(child);
                    }
                  }
                } else if (boxes[type]) {
                  var decode = boxes[type].decode;
                  obj = decode(buffer, start, end);
                } else {
                  obj.buffer = Buffer.from(buffer.slice(start, end));
                }

                obj.length = headers.length;
                obj.contentLen = headers.contentLen;
                obj.type = headers.type;
                obj.version = headers.version;
                obj.flags = headers.flags;
                return obj;
              };

              Box.encodingLength = function (obj) {
                var type = obj.type;

                var len = 8;
                if (boxes.fullBoxes[type]) {
                  len += 4;
                }

                if (containers[type]) {
                  var contents = containers[type];
                  contents.forEach(function (childType) {
                    if (childType.length === 5) {
                      var entry = obj[childType] || [];
                      childType = childType.substr(0, 4);
                      entry.forEach(function (child) {
                        child.type = childType;
                        len += Box.encodingLength(child);
                      });
                    } else if (obj[childType]) {
                      var child = obj[childType];
                      child.type = childType;
                      len += Box.encodingLength(child);
                    }
                  });
                  if (obj.otherBoxes) {
                    obj.otherBoxes.forEach(function (child) {
                      len += Box.encodingLength(child);
                    });
                  }
                } else if (boxes[type]) {
                  len += boxes[type].encodingLength(obj);
                } else if (obj.buffer) {
                  len += obj.buffer.length;
                } else {
                  throw new Error(
                    "Either `type` must be set to a known type (not'" +
                      type +
                      "') or `buffer` must be set"
                  );
                }

                if (len > UINT32_MAX) {
                  len += 8;
                }

                obj.length = len;
                return len;
              };
            }.call(this));
          }.call(this, require("buffer").Buffer));
        },
        { "./boxes": 21, buffer: 7, uint64be: 59 },
      ],
      24: [
        function (require, module, exports) {
          (function (Buffer) {
            (function () {
              var stream = require("readable-stream");
              var nextEvent = require("next-event");
              var Box = require("mp4-box-encoding");

              var EMPTY = Buffer.alloc(0);

              class Decoder extends stream.Writable {
                constructor(opts) {
                  super(opts);

                  this.destroyed = false;

                  this._pending = 0;
                  this._missing = 0;
                  this._ignoreEmpty = false;
                  this._buf = null;
                  this._str = null;
                  this._cb = null;
                  this._ondrain = null;
                  this._writeBuffer = null;
                  this._writeCb = null;

                  this._ondrain = null;
                  this._kick();
                }

                destroy(err) {
                  if (this.destroyed) return;
                  this.destroyed = true;
                  if (err) this.emit("error", err);
                  this.emit("close");
                }

                _write(data, enc, next) {
                  if (this.destroyed) return;
                  var drained =
                    !this._str || !this._str._writableState.needDrain;

                  while (data.length && !this.destroyed) {
                    if (!this._missing && !this._ignoreEmpty) {
                      this._writeBuffer = data;
                      this._writeCb = next;
                      return;
                    }

                    var consumed =
                      data.length < this._missing ? data.length : this._missing;
                    if (this._buf)
                      data.copy(this._buf, this._buf.length - this._missing);
                    else if (this._str)
                      drained = this._str.write(
                        consumed === data.length
                          ? data
                          : data.slice(0, consumed)
                      );

                    this._missing -= consumed;

                    if (!this._missing) {
                      var buf = this._buf;
                      var cb = this._cb;
                      var stream = this._str;

                      this._buf = this._cb = this._str = this._ondrain = null;
                      drained = true;

                      this._ignoreEmpty = false;
                      if (stream) stream.end();
                      if (cb) cb(buf);
                    }

                    data =
                      consumed === data.length ? EMPTY : data.slice(consumed);
                  }

                  if (this._pending && !this._missing) {
                    this._writeBuffer = data;
                    this._writeCb = next;
                    return;
                  }

                  if (drained) next();
                  else this._ondrain(next);
                }

                _buffer(size, cb) {
                  this._missing = size;
                  this._buf = Buffer.alloc(size);
                  this._cb = cb;
                }

                _stream(size, cb) {
                  this._missing = size;
                  this._str = new MediaData(this);
                  this._ondrain = nextEvent(this._str, "drain");
                  this._pending++;
                  this._str.on("end", () => {
                    this._pending--;
                    this._kick();
                  });
                  this._cb = cb;
                  return this._str;
                }

                _readBox() {
                  const bufferHeaders = (len, buf) => {
                    this._buffer(len, (additionalBuf) => {
                      if (buf) {
                        buf = Buffer.concat([buf, additionalBuf]);
                      } else {
                        buf = additionalBuf;
                      }
                      var headers = Box.readHeaders(buf);
                      if (typeof headers === "number") {
                        bufferHeaders(headers - buf.length, buf);
                      } else {
                        this._pending++;
                        this._headers = headers;
                        this.emit("box", headers);
                      }
                    });
                  };

                  bufferHeaders(8);
                }

                stream() {
                  if (!this._headers)
                    throw new Error(
                      "this function can only be called once after 'box' is emitted"
                    );
                  var headers = this._headers;
                  this._headers = null;

                  return this._stream(headers.contentLen, () => {
                    this._pending--;
                    this._kick();
                  });
                }

                decode(cb) {
                  if (!this._headers)
                    throw new Error(
                      "this function can only be called once after 'box' is emitted"
                    );
                  var headers = this._headers;
                  this._headers = null;

                  this._buffer(headers.contentLen, (buf) => {
                    var box = Box.decodeWithoutHeaders(headers, buf);
                    cb(box);
                    this._pending--;
                    this._kick();
                  });
                }

                ignore() {
                  if (!this._headers)
                    throw new Error(
                      "this function can only be called once after 'box' is emitted"
                    );
                  var headers = this._headers;
                  this._headers = null;

                  this._missing = headers.contentLen;
                  if (this._missing === 0) {
                    this._ignoreEmpty = true;
                  }
                  this._cb = () => {
                    this._pending--;
                    this._kick();
                  };
                }

                _kick() {
                  if (this._pending) return;
                  if (!this._buf && !this._str) this._readBox();
                  if (this._writeBuffer) {
                    var next = this._writeCb;
                    var buffer = this._writeBuffer;
                    this._writeBuffer = null;
                    this._writeCb = null;
                    this._write(buffer, null, next);
                  }
                }
              }

              class MediaData extends stream.PassThrough {
                constructor(parent) {
                  super();
                  this._parent = parent;
                  this.destroyed = false;
                }

                destroy(err) {
                  if (this.destroyed) return;
                  this.destroyed = true;
                  this._parent.destroy(err);
                  if (err) this.emit("error", err);
                  this.emit("close");
                }
              }

              module.exports = Decoder;
            }.call(this));
          }.call(this, require("buffer").Buffer));
        },
        {
          buffer: 7,
          "mp4-box-encoding": 23,
          "next-event": 27,
          "readable-stream": 49,
        },
      ],
      25: [
        function (require, module, exports) {
          (function (Buffer) {
            (function () {
              var stream = require("readable-stream");
              var Box = require("mp4-box-encoding");
              var queueMicrotask = require("queue-microtask");

              function noop() {}

              class Encoder extends stream.Readable {
                constructor(opts) {
                  super(opts);

                  this.destroyed = false;

                  this._finalized = false;
                  this._reading = false;
                  this._stream = null;
                  this._drain = null;
                  this._want = false;

                  this._onreadable = () => {
                    if (!this._want) return;
                    this._want = false;
                    this._read();
                  };

                  this._onend = () => {
                    this._stream = null;
                  };
                }

                mdat(size, cb) {
                  this.mediaData(size, cb);
                }

                mediaData(size, cb) {
                  var stream = new MediaData(this);
                  this.box(
                    {
                      type: "mdat",
                      contentLength: size,
                      encodeBufferLen: 8,
                      stream: stream,
                    },
                    cb
                  );
                  return stream;
                }

                box(box, cb) {
                  if (!cb) cb = noop;
                  if (this.destroyed)
                    return cb(new Error("Encoder is destroyed"));

                  var buf;
                  if (box.encodeBufferLen) {
                    buf = Buffer.alloc(box.encodeBufferLen);
                  }
                  if (box.stream) {
                    box.buffer = null;
                    buf = Box.encode(box, buf);
                    this.push(buf);
                    this._stream = box.stream;
                    this._stream.on("readable", this._onreadable);
                    this._stream.on("end", this._onend);
                    this._stream.on("end", cb);
                    this._forward();
                  } else {
                    buf = Box.encode(box, buf);
                    var drained = this.push(buf);
                    if (drained) return queueMicrotask(cb);
                    this._drain = cb;
                  }
                }

                destroy(err) {
                  if (this.destroyed) return;
                  this.destroyed = true;
                  if (this._stream && this._stream.destroy)
                    this._stream.destroy();
                  this._stream = null;
                  if (this._drain) {
                    var cb = this._drain;
                    this._drain = null;
                    cb(err);
                  }
                  if (err) this.emit("error", err);
                  this.emit("close");
                }

                finalize() {
                  this._finalized = true;
                  if (!this._stream && !this._drain) {
                    this.push(null);
                  }
                }

                _forward() {
                  if (!this._stream) return;

                  while (!this.destroyed) {
                    var buf = this._stream.read();

                    if (!buf) {
                      this._want = !!this._stream;
                      return;
                    }

                    if (!this.push(buf)) return;
                  }
                }

                _read() {
                  if (this._reading || this.destroyed) return;
                  this._reading = true;

                  if (this._stream) this._forward();
                  if (this._drain) {
                    var drain = this._drain;
                    this._drain = null;
                    drain();
                  }

                  this._reading = false;
                  if (this._finalized) {
                    this.push(null);
                  }
                }
              }

              class MediaData extends stream.PassThrough {
                constructor(parent) {
                  super();
                  this._parent = parent;
                  this.destroyed = false;
                }

                destroy(err) {
                  if (this.destroyed) return;
                  this.destroyed = true;
                  this._parent.destroy(err);
                  if (err) this.emit("error", err);
                  this.emit("close");
                }
              }

              module.exports = Encoder;
            }.call(this));
          }.call(this, require("buffer").Buffer));
        },
        {
          buffer: 7,
          "mp4-box-encoding": 23,
          "queue-microtask": 32,
          "readable-stream": 49,
        },
      ],
      26: [
        function (require, module, exports) {
          const Decoder = require("./decode");
          const Encoder = require("./encode");

          exports.decode = (opts) => new Decoder(opts);
          exports.encode = (opts) => new Encoder(opts);
        },
        { "./decode": 24, "./encode": 25 },
      ],
      27: [
        function (require, module, exports) {
          module.exports = nextEvent;

          function nextEvent(emitter, name) {
            var next = null;
            emitter.on(name, function (data) {
              if (!next) return;
              var fn = next;
              next = null;
              fn(data);
            });

            return function (once) {
              next = once;
            };
          }
        },
        {},
      ],
      28: [
        function (require, module, exports) {
          var wrappy = require("wrappy");
          module.exports = wrappy(once);
          module.exports.strict = wrappy(onceStrict);

          once.proto = once(function () {
            Object.defineProperty(Function.prototype, "once", {
              value: function () {
                return once(this);
              },
              configurable: true,
            });

            Object.defineProperty(Function.prototype, "onceStrict", {
              value: function () {
                return onceStrict(this);
              },
              configurable: true,
            });
          });

          function once(fn) {
            var f = function () {
              if (f.called) return f.value;
              f.called = true;
              return (f.value = fn.apply(this, arguments));
            };
            f.called = false;
            return f;
          }

          function onceStrict(fn) {
            var f = function () {
              if (f.called) throw new Error(f.onceError);
              f.called = true;
              return (f.value = fn.apply(this, arguments));
            };
            var name = fn.name || "Function wrapped with `once`";
            f.onceError = name + " shouldn't be called more than once";
            f.called = false;
            return f;
          }
        },
        { wrappy: 63 },
      ],
      29: [
        function (require, module, exports) {
          (function (process) {
            (function () {
              // 'path' module extracted from Node.js v8.11.1 (only the posix part)
              // transplited with Babel

              // Copyright Joyent, Inc. and other Node contributors.
              //
              // Permission is hereby granted, free of charge, to any person obtaining a
              // copy of this software and associated documentation files (the
              // "Software"), to deal in the Software without restriction, including
              // without limitation the rights to use, copy, modify, merge, publish,
              // distribute, sublicense, and/or sell copies of the Software, and to permit
              // persons to whom the Software is furnished to do so, subject to the
              // following conditions:
              //
              // The above copyright notice and this permission notice shall be included
              // in all copies or substantial portions of the Software.
              //
              // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
              // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
              // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
              // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
              // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
              // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
              // USE OR OTHER DEALINGS IN THE SOFTWARE.

              "use strict";

              function assertPath(path) {
                if (typeof path !== "string") {
                  throw new TypeError(
                    "Path must be a string. Received " + JSON.stringify(path)
                  );
                }
              }

              // Resolves . and .. elements in a path with directory names
              function normalizeStringPosix(path, allowAboveRoot) {
                var res = "";
                var lastSegmentLength = 0;
                var lastSlash = -1;
                var dots = 0;
                var code;
                for (var i = 0; i <= path.length; ++i) {
                  if (i < path.length) code = path.charCodeAt(i);
                  else if (code === 47 /*/*/) break;
                  else code = 47 /*/*/;
                  if (code === 47 /*/*/) {
                    if (lastSlash === i - 1 || dots === 1) {
                      // NOOP
                    } else if (lastSlash !== i - 1 && dots === 2) {
                      if (
                        res.length < 2 ||
                        lastSegmentLength !== 2 ||
                        res.charCodeAt(res.length - 1) !== 46 /*.*/ ||
                        res.charCodeAt(res.length - 2) !== 46 /*.*/
                      ) {
                        if (res.length > 2) {
                          var lastSlashIndex = res.lastIndexOf("/");
                          if (lastSlashIndex !== res.length - 1) {
                            if (lastSlashIndex === -1) {
                              res = "";
                              lastSegmentLength = 0;
                            } else {
                              res = res.slice(0, lastSlashIndex);
                              lastSegmentLength =
                                res.length - 1 - res.lastIndexOf("/");
                            }
                            lastSlash = i;
                            dots = 0;
                            continue;
                          }
                        } else if (res.length === 2 || res.length === 1) {
                          res = "";
                          lastSegmentLength = 0;
                          lastSlash = i;
                          dots = 0;
                          continue;
                        }
                      }
                      if (allowAboveRoot) {
                        if (res.length > 0) res += "/..";
                        else res = "..";
                        lastSegmentLength = 2;
                      }
                    } else {
                      if (res.length > 0)
                        res += "/" + path.slice(lastSlash + 1, i);
                      else res = path.slice(lastSlash + 1, i);
                      lastSegmentLength = i - lastSlash - 1;
                    }
                    lastSlash = i;
                    dots = 0;
                  } else if (code === 46 /*.*/ && dots !== -1) {
                    ++dots;
                  } else {
                    dots = -1;
                  }
                }
                return res;
              }

              function _format(sep, pathObject) {
                var dir = pathObject.dir || pathObject.root;
                var base =
                  pathObject.base ||
                  (pathObject.name || "") + (pathObject.ext || "");
                if (!dir) {
                  return base;
                }
                if (dir === pathObject.root) {
                  return dir + base;
                }
                return dir + sep + base;
              }

              var posix = {
                // path.resolve([from ...], to)
                resolve: function resolve() {
                  var resolvedPath = "";
                  var resolvedAbsolute = false;
                  var cwd;

                  for (
                    var i = arguments.length - 1;
                    i >= -1 && !resolvedAbsolute;
                    i--
                  ) {
                    var path;
                    if (i >= 0) path = arguments[i];
                    else {
                      if (cwd === undefined) cwd = process.cwd();
                      path = cwd;
                    }

                    assertPath(path);

                    // Skip empty entries
                    if (path.length === 0) {
                      continue;
                    }

                    resolvedPath = path + "/" + resolvedPath;
                    resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
                  }

                  // At this point the path should be resolved to a full absolute path, but
                  // handle relative paths to be safe (might happen when process.cwd() fails)

                  // Normalize the path
                  resolvedPath = normalizeStringPosix(
                    resolvedPath,
                    !resolvedAbsolute
                  );

                  if (resolvedAbsolute) {
                    if (resolvedPath.length > 0) return "/" + resolvedPath;
                    else return "/";
                  } else if (resolvedPath.length > 0) {
                    return resolvedPath;
                  } else {
                    return ".";
                  }
                },

                normalize: function normalize(path) {
                  assertPath(path);

                  if (path.length === 0) return ".";

                  var isAbsolute = path.charCodeAt(0) === 47; /*/*/
                  var trailingSeparator =
                    path.charCodeAt(path.length - 1) === 47; /*/*/

                  // Normalize the path
                  path = normalizeStringPosix(path, !isAbsolute);

                  if (path.length === 0 && !isAbsolute) path = ".";
                  if (path.length > 0 && trailingSeparator) path += "/";

                  if (isAbsolute) return "/" + path;
                  return path;
                },

                isAbsolute: function isAbsolute(path) {
                  assertPath(path);
                  return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
                },

                join: function join() {
                  if (arguments.length === 0) return ".";
                  var joined;
                  for (var i = 0; i < arguments.length; ++i) {
                    var arg = arguments[i];
                    assertPath(arg);
                    if (arg.length > 0) {
                      if (joined === undefined) joined = arg;
                      else joined += "/" + arg;
                    }
                  }
                  if (joined === undefined) return ".";
                  return posix.normalize(joined);
                },

                relative: function relative(from, to) {
                  assertPath(from);
                  assertPath(to);

                  if (from === to) return "";

                  from = posix.resolve(from);
                  to = posix.resolve(to);

                  if (from === to) return "";

                  // Trim any leading backslashes
                  var fromStart = 1;
                  for (; fromStart < from.length; ++fromStart) {
                    if (from.charCodeAt(fromStart) !== 47 /*/*/) break;
                  }
                  var fromEnd = from.length;
                  var fromLen = fromEnd - fromStart;

                  // Trim any leading backslashes
                  var toStart = 1;
                  for (; toStart < to.length; ++toStart) {
                    if (to.charCodeAt(toStart) !== 47 /*/*/) break;
                  }
                  var toEnd = to.length;
                  var toLen = toEnd - toStart;

                  // Compare paths to find the longest common path from root
                  var length = fromLen < toLen ? fromLen : toLen;
                  var lastCommonSep = -1;
                  var i = 0;
                  for (; i <= length; ++i) {
                    if (i === length) {
                      if (toLen > length) {
                        if (to.charCodeAt(toStart + i) === 47 /*/*/) {
                          // We get here if `from` is the exact base path for `to`.
                          // For example: from='/foo/bar'; to='/foo/bar/baz'
                          return to.slice(toStart + i + 1);
                        } else if (i === 0) {
                          // We get here if `from` is the root
                          // For example: from='/'; to='/foo'
                          return to.slice(toStart + i);
                        }
                      } else if (fromLen > length) {
                        if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
                          // We get here if `to` is the exact base path for `from`.
                          // For example: from='/foo/bar/baz'; to='/foo/bar'
                          lastCommonSep = i;
                        } else if (i === 0) {
                          // We get here if `to` is the root.
                          // For example: from='/foo'; to='/'
                          lastCommonSep = 0;
                        }
                      }
                      break;
                    }
                    var fromCode = from.charCodeAt(fromStart + i);
                    var toCode = to.charCodeAt(toStart + i);
                    if (fromCode !== toCode) break;
                    else if (fromCode === 47 /*/*/) lastCommonSep = i;
                  }

                  var out = "";
                  // Generate the relative path based on the path difference between `to`
                  // and `from`
                  for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
                    if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
                      if (out.length === 0) out += "..";
                      else out += "/..";
                    }
                  }

                  // Lastly, append the rest of the destination (`to`) path that comes after
                  // the common path parts
                  if (out.length > 0)
                    return out + to.slice(toStart + lastCommonSep);
                  else {
                    toStart += lastCommonSep;
                    if (to.charCodeAt(toStart) === 47 /*/*/) ++toStart;
                    return to.slice(toStart);
                  }
                },

                _makeLong: function _makeLong(path) {
                  return path;
                },

                dirname: function dirname(path) {
                  assertPath(path);
                  if (path.length === 0) return ".";
                  var code = path.charCodeAt(0);
                  var hasRoot = code === 47; /*/*/
                  var end = -1;
                  var matchedSlash = true;
                  for (var i = path.length - 1; i >= 1; --i) {
                    code = path.charCodeAt(i);
                    if (code === 47 /*/*/) {
                      if (!matchedSlash) {
                        end = i;
                        break;
                      }
                    } else {
                      // We saw the first non-path separator
                      matchedSlash = false;
                    }
                  }

                  if (end === -1) return hasRoot ? "/" : ".";
                  if (hasRoot && end === 1) return "//";
                  return path.slice(0, end);
                },

                basename: function basename(path, ext) {
                  if (ext !== undefined && typeof ext !== "string")
                    throw new TypeError('"ext" argument must be a string');
                  assertPath(path);

                  var start = 0;
                  var end = -1;
                  var matchedSlash = true;
                  var i;

                  if (
                    ext !== undefined &&
                    ext.length > 0 &&
                    ext.length <= path.length
                  ) {
                    if (ext.length === path.length && ext === path) return "";
                    var extIdx = ext.length - 1;
                    var firstNonSlashEnd = -1;
                    for (i = path.length - 1; i >= 0; --i) {
                      var code = path.charCodeAt(i);
                      if (code === 47 /*/*/) {
                        // If we reached a path separator that was not part of a set of path
                        // separators at the end of the string, stop now
                        if (!matchedSlash) {
                          start = i + 1;
                          break;
                        }
                      } else {
                        if (firstNonSlashEnd === -1) {
                          // We saw the first non-path separator, remember this index in case
                          // we need it if the extension ends up not matching
                          matchedSlash = false;
                          firstNonSlashEnd = i + 1;
                        }
                        if (extIdx >= 0) {
                          // Try to match the explicit extension
                          if (code === ext.charCodeAt(extIdx)) {
                            if (--extIdx === -1) {
                              // We matched the extension, so mark this as the end of our path
                              // component
                              end = i;
                            }
                          } else {
                            // Extension does not match, so our result is the entire path
                            // component
                            extIdx = -1;
                            end = firstNonSlashEnd;
                          }
                        }
                      }
                    }

                    if (start === end) end = firstNonSlashEnd;
                    else if (end === -1) end = path.length;
                    return path.slice(start, end);
                  } else {
                    for (i = path.length - 1; i >= 0; --i) {
                      if (path.charCodeAt(i) === 47 /*/*/) {
                        // If we reached a path separator that was not part of a set of path
                        // separators at the end of the string, stop now
                        if (!matchedSlash) {
                          start = i + 1;
                          break;
                        }
                      } else if (end === -1) {
                        // We saw the first non-path separator, mark this as the end of our
                        // path component
                        matchedSlash = false;
                        end = i + 1;
                      }
                    }

                    if (end === -1) return "";
                    return path.slice(start, end);
                  }
                },

                extname: function extname(path) {
                  assertPath(path);
                  var startDot = -1;
                  var startPart = 0;
                  var end = -1;
                  var matchedSlash = true;
                  // Track the state of characters (if any) we see before our first dot and
                  // after any path separator we find
                  var preDotState = 0;
                  for (var i = path.length - 1; i >= 0; --i) {
                    var code = path.charCodeAt(i);
                    if (code === 47 /*/*/) {
                      // If we reached a path separator that was not part of a set of path
                      // separators at the end of the string, stop now
                      if (!matchedSlash) {
                        startPart = i + 1;
                        break;
                      }
                      continue;
                    }
                    if (end === -1) {
                      // We saw the first non-path separator, mark this as the end of our
                      // extension
                      matchedSlash = false;
                      end = i + 1;
                    }
                    if (code === 46 /*.*/) {
                      // If this is our first dot, mark it as the start of our extension
                      if (startDot === -1) startDot = i;
                      else if (preDotState !== 1) preDotState = 1;
                    } else if (startDot !== -1) {
                      // We saw a non-dot and non-path separator before our dot, so we should
                      // have a good chance at having a non-empty extension
                      preDotState = -1;
                    }
                  }

                  if (
                    startDot === -1 ||
                    end === -1 ||
                    // We saw a non-dot character immediately before the dot
                    preDotState === 0 ||
                    // The (right-most) trimmed path component is exactly '..'
                    (preDotState === 1 &&
                      startDot === end - 1 &&
                      startDot === startPart + 1)
                  ) {
                    return "";
                  }
                  return path.slice(startDot, end);
                },

                format: function format(pathObject) {
                  if (pathObject === null || typeof pathObject !== "object") {
                    throw new TypeError(
                      'The "pathObject" argument must be of type Object. Received type ' +
                        typeof pathObject
                    );
                  }
                  return _format("/", pathObject);
                },

                parse: function parse(path) {
                  assertPath(path);

                  var ret = { root: "", dir: "", base: "", ext: "", name: "" };
                  if (path.length === 0) return ret;
                  var code = path.charCodeAt(0);
                  var isAbsolute = code === 47; /*/*/
                  var start;
                  if (isAbsolute) {
                    ret.root = "/";
                    start = 1;
                  } else {
                    start = 0;
                  }
                  var startDot = -1;
                  var startPart = 0;
                  var end = -1;
                  var matchedSlash = true;
                  var i = path.length - 1;

                  // Track the state of characters (if any) we see before our first dot and
                  // after any path separator we find
                  var preDotState = 0;

                  // Get non-dir info
                  for (; i >= start; --i) {
                    code = path.charCodeAt(i);
                    if (code === 47 /*/*/) {
                      // If we reached a path separator that was not part of a set of path
                      // separators at the end of the string, stop now
                      if (!matchedSlash) {
                        startPart = i + 1;
                        break;
                      }
                      continue;
                    }
                    if (end === -1) {
                      // We saw the first non-path separator, mark this as the end of our
                      // extension
                      matchedSlash = false;
                      end = i + 1;
                    }
                    if (code === 46 /*.*/) {
                      // If this is our first dot, mark it as the start of our extension
                      if (startDot === -1) startDot = i;
                      else if (preDotState !== 1) preDotState = 1;
                    } else if (startDot !== -1) {
                      // We saw a non-dot and non-path separator before our dot, so we should
                      // have a good chance at having a non-empty extension
                      preDotState = -1;
                    }
                  }

                  if (
                    startDot === -1 ||
                    end === -1 ||
                    // We saw a non-dot character immediately before the dot
                    preDotState === 0 ||
                    // The (right-most) trimmed path component is exactly '..'
                    (preDotState === 1 &&
                      startDot === end - 1 &&
                      startDot === startPart + 1)
                  ) {
                    if (end !== -1) {
                      if (startPart === 0 && isAbsolute)
                        ret.base = ret.name = path.slice(1, end);
                      else ret.base = ret.name = path.slice(startPart, end);
                    }
                  } else {
                    if (startPart === 0 && isAbsolute) {
                      ret.name = path.slice(1, startDot);
                      ret.base = path.slice(1, end);
                    } else {
                      ret.name = path.slice(startPart, startDot);
                      ret.base = path.slice(startPart, end);
                    }
                    ret.ext = path.slice(startDot, end);
                  }

                  if (startPart > 0) ret.dir = path.slice(0, startPart - 1);
                  else if (isAbsolute) ret.dir = "/";

                  return ret;
                },

                sep: "/",
                delimiter: ":",
                win32: null,
                posix: null,
              };

              posix.posix = posix;

              module.exports = posix;
            }.call(this));
          }.call(this, require("_process")));
        },
        { _process: 30 },
      ],
      30: [
        function (require, module, exports) {
          // shim for using process in browser
          var process = (module.exports = {});

          // cached from whatever global is present so that test runners that stub it
          // don't break things.  But we need to wrap it in a try catch in case it is
          // wrapped in strict mode code which doesn't define any globals.  It's inside a
          // function because try/catches deoptimize in certain engines.

          var cachedSetTimeout;
          var cachedClearTimeout;

          function defaultSetTimout() {
            throw new Error("setTimeout has not been defined");
          }
          function defaultClearTimeout() {
            throw new Error("clearTimeout has not been defined");
          }
          (function () {
            try {
              if (typeof setTimeout === "function") {
                cachedSetTimeout = setTimeout;
              } else {
                cachedSetTimeout = defaultSetTimout;
              }
            } catch (e) {
              cachedSetTimeout = defaultSetTimout;
            }
            try {
              if (typeof clearTimeout === "function") {
                cachedClearTimeout = clearTimeout;
              } else {
                cachedClearTimeout = defaultClearTimeout;
              }
            } catch (e) {
              cachedClearTimeout = defaultClearTimeout;
            }
          })();
          function runTimeout(fun) {
            if (cachedSetTimeout === setTimeout) {
              //normal enviroments in sane situations
              return setTimeout(fun, 0);
            }
            // if setTimeout wasn't available but was latter defined
            if (
              (cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) &&
              setTimeout
            ) {
              cachedSetTimeout = setTimeout;
              return setTimeout(fun, 0);
            }
            try {
              // when when somebody has screwed with setTimeout but no I.E. maddness
              return cachedSetTimeout(fun, 0);
            } catch (e) {
              try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
                return cachedSetTimeout.call(null, fun, 0);
              } catch (e) {
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
                return cachedSetTimeout.call(this, fun, 0);
              }
            }
          }
          function runClearTimeout(marker) {
            if (cachedClearTimeout === clearTimeout) {
              //normal enviroments in sane situations
              return clearTimeout(marker);
            }
            // if clearTimeout wasn't available but was latter defined
            if (
              (cachedClearTimeout === defaultClearTimeout ||
                !cachedClearTimeout) &&
              clearTimeout
            ) {
              cachedClearTimeout = clearTimeout;
              return clearTimeout(marker);
            }
            try {
              // when when somebody has screwed with setTimeout but no I.E. maddness
              return cachedClearTimeout(marker);
            } catch (e) {
              try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
                return cachedClearTimeout.call(null, marker);
              } catch (e) {
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
                // Some versions of I.E. have different rules for clearTimeout vs setTimeout
                return cachedClearTimeout.call(this, marker);
              }
            }
          }
          var queue = [];
          var draining = false;
          var currentQueue;
          var queueIndex = -1;

          function cleanUpNextTick() {
            if (!draining || !currentQueue) {
              return;
            }
            draining = false;
            if (currentQueue.length) {
              queue = currentQueue.concat(queue);
            } else {
              queueIndex = -1;
            }
            if (queue.length) {
              drainQueue();
            }
          }

          function drainQueue() {
            if (draining) {
              return;
            }
            var timeout = runTimeout(cleanUpNextTick);
            draining = true;

            var len = queue.length;
            while (len) {
              currentQueue = queue;
              queue = [];
              while (++queueIndex < len) {
                if (currentQueue) {
                  currentQueue[queueIndex].run();
                }
              }
              queueIndex = -1;
              len = queue.length;
            }
            currentQueue = null;
            draining = false;
            runClearTimeout(timeout);
          }

          process.nextTick = function (fun) {
            var args = new Array(arguments.length - 1);
            if (arguments.length > 1) {
              for (var i = 1; i < arguments.length; i++) {
                args[i - 1] = arguments[i];
              }
            }
            queue.push(new Item(fun, args));
            if (queue.length === 1 && !draining) {
              runTimeout(drainQueue);
            }
          };

          // v8 likes predictible objects
          function Item(fun, array) {
            this.fun = fun;
            this.array = array;
          }
          Item.prototype.run = function () {
            this.fun.apply(null, this.array);
          };
          process.title = "browser";
          process.browser = true;
          process.env = {};
          process.argv = [];
          process.version = ""; // empty string to avoid regexp issues
          process.versions = {};

          function noop() {}

          process.on = noop;
          process.addListener = noop;
          process.once = noop;
          process.off = noop;
          process.removeListener = noop;
          process.removeAllListeners = noop;
          process.emit = noop;
          process.prependListener = noop;
          process.prependOnceListener = noop;

          process.listeners = function (name) {
            return [];
          };

          process.binding = function (name) {
            throw new Error("process.binding is not supported");
          };

          process.cwd = function () {
            return "/";
          };
          process.chdir = function (dir) {
            throw new Error("process.chdir is not supported");
          };
          process.umask = function () {
            return 0;
          };
        },
        {},
      ],
      31: [
        function (require, module, exports) {
          (function (process) {
            (function () {
              var once = require("once");
              var eos = require("end-of-stream");
              var fs = require("fs"); // we only need fs to get the ReadStream and WriteStream prototypes

              var noop = function () {};
              var ancient = /^v?\.0/.test(process.version);

              var isFn = function (fn) {
                return typeof fn === "function";
              };

              var isFS = function (stream) {
                if (!ancient) return false; // newer node version do not need to care about fs is a special way
                if (!fs) return false; // browser
                return (
                  (stream instanceof (fs.ReadStream || noop) ||
                    stream instanceof (fs.WriteStream || noop)) &&
                  isFn(stream.close)
                );
              };

              var isRequest = function (stream) {
                return stream.setHeader && isFn(stream.abort);
              };

              var destroyer = function (stream, reading, writing, callback) {
                callback = once(callback);

                var closed = false;
                stream.on("close", function () {
                  closed = true;
                });

                eos(
                  stream,
                  { readable: reading, writable: writing },
                  function (err) {
                    if (err) return callback(err);
                    closed = true;
                    callback();
                  }
                );

                var destroyed = false;
                return function (err) {
                  if (closed) return;
                  if (destroyed) return;
                  destroyed = true;

                  if (isFS(stream)) return stream.close(noop); // use close for fs streams to avoid fd leaks
                  if (isRequest(stream)) return stream.abort(); // request.destroy just do .end - .abort is what we want

                  if (isFn(stream.destroy)) return stream.destroy();

                  callback(err || new Error("stream was destroyed"));
                };
              };

              var call = function (fn) {
                fn();
              };

              var pipe = function (from, to) {
                return from.pipe(to);
              };

              var pump = function () {
                var streams = Array.prototype.slice.call(arguments);
                var callback =
                  (isFn(streams[streams.length - 1] || noop) &&
                    streams.pop()) ||
                  noop;

                if (Array.isArray(streams[0])) streams = streams[0];
                if (streams.length < 2)
                  throw new Error("pump requires two streams per minimum");

                var error;
                var destroys = streams.map(function (stream, i) {
                  var reading = i < streams.length - 1;
                  var writing = i > 0;
                  return destroyer(stream, reading, writing, function (err) {
                    if (!error) error = err;
                    if (err) destroys.forEach(call);
                    if (reading) return;
                    destroys.forEach(call);
                    callback(error);
                  });
                });

                return streams.reduce(pipe);
              };

              module.exports = pump;
            }.call(this));
          }.call(this, require("_process")));
        },
        { _process: 30, "end-of-stream": 11, fs: 3, once: 28 },
      ],
      32: [
        function (require, module, exports) {
          (function (global) {
            (function () {
              /*! queue-microtask. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
              let promise;

              module.exports =
                typeof queueMicrotask === "function"
                  ? queueMicrotask.bind(
                      typeof window !== "undefined" ? window : global
                    )
                  : // reuse resolved promise, and allocate it lazily
                    (cb) =>
                      (promise || (promise = Promise.resolve()))
                        .then(cb)
                        .catch((err) =>
                          setTimeout(() => {
                            throw err;
                          }, 0)
                        );
            }.call(this));
          }.call(
            this,
            typeof global !== "undefined"
              ? global
              : typeof self !== "undefined"
              ? self
              : typeof window !== "undefined"
              ? window
              : {}
          ));
        },
        {},
      ],
      33: [
        function (require, module, exports) {
          /*!
           * range-parser
           * Copyright(c) 2012-2014 TJ Holowaychuk
           * Copyright(c) 2015-2016 Douglas Christopher Wilson
           * MIT Licensed
           */

          "use strict";

          /**
           * Module exports.
           * @public
           */

          module.exports = rangeParser;

          /**
           * Parse "Range" header `str` relative to the given file `size`.
           *
           * @param {Number} size
           * @param {String} str
           * @param {Object} [options]
           * @return {Array}
           * @public
           */

          function rangeParser(size, str, options) {
            if (typeof str !== "string") {
              throw new TypeError("argument str must be a string");
            }

            var index = str.indexOf("=");

            if (index === -1) {
              return -2;
            }

            // split the range string
            var arr = str.slice(index + 1).split(",");
            var ranges = [];

            // add ranges type
            ranges.type = str.slice(0, index);

            // parse all ranges
            for (var i = 0; i < arr.length; i++) {
              var range = arr[i].split("-");
              var start = parseInt(range[0], 10);
              var end = parseInt(range[1], 10);

              // -nnn
              if (isNaN(start)) {
                start = size - end;
                end = size - 1;
                // nnn-
              } else if (isNaN(end)) {
                end = size - 1;
              }

              // limit last-byte-pos to current length
              if (end > size - 1) {
                end = size - 1;
              }

              // invalid or unsatisifiable
              if (isNaN(start) || isNaN(end) || start > end || start < 0) {
                continue;
              }

              // add range
              ranges.push({
                start: start,
                end: end,
              });
            }

            if (ranges.length < 1) {
              // unsatisifiable
              return -1;
            }

            return options && options.combine ? combineRanges(ranges) : ranges;
          }

          /**
           * Combine overlapping & adjacent ranges.
           * @private
           */

          function combineRanges(ranges) {
            var ordered = ranges.map(mapWithIndex).sort(sortByRangeStart);

            for (var j = 0, i = 1; i < ordered.length; i++) {
              var range = ordered[i];
              var current = ordered[j];

              if (range.start > current.end + 1) {
                // next range
                ordered[++j] = range;
              } else if (range.end > current.end) {
                // extend range
                current.end = range.end;
                current.index = Math.min(current.index, range.index);
              }
            }

            // trim ordered array
            ordered.length = j + 1;

            // generate combined range
            var combined = ordered.sort(sortByRangeIndex).map(mapWithoutIndex);

            // copy ranges type
            combined.type = ranges.type;

            return combined;
          }

          /**
           * Map function to add index value to ranges.
           * @private
           */

          function mapWithIndex(range, index) {
            return {
              start: range.start,
              end: range.end,
              index: index,
            };
          }

          /**
           * Map function to remove index value from ranges.
           * @private
           */

          function mapWithoutIndex(range) {
            return {
              start: range.start,
              end: range.end,
            };
          }

          /**
           * Sort function to sort ranges by index.
           * @private
           */

          function sortByRangeIndex(a, b) {
            return a.index - b.index;
          }

          /**
           * Sort function to sort ranges by start position.
           * @private
           */

          function sortByRangeStart(a, b) {
            return a.start - b.start;
          }
        },
        {},
      ],
      34: [
        function (require, module, exports) {
          /*
Instance of writable stream.

call .get(length) or .discard(length) to get a stream (relative to the last end)

emits 'stalled' once everything is written

*/
          const { Writable, PassThrough } = require("readable-stream");

          class RangeSliceStream extends Writable {
            constructor(offset, opts = {}) {
              super(opts);

              this.destroyed = false;
              this._queue = [];
              this._position = offset || 0;
              this._cb = null;
              this._buffer = null;
              this._out = null;
            }

            _write(chunk, encoding, cb) {
              let drained = true;

              while (true) {
                if (this.destroyed) {
                  return;
                }

                // Wait for more queue entries
                if (this._queue.length === 0) {
                  this._buffer = chunk;
                  this._cb = cb;
                  return;
                }

                this._buffer = null;
                var currRange = this._queue[0];
                // Relative to the start of chunk, what data do we need?
                const writeStart = Math.max(
                  currRange.start - this._position,
                  0
                );
                const writeEnd = currRange.end - this._position;

                // Check if we need to throw it all away
                if (writeStart >= chunk.length) {
                  this._position += chunk.length;
                  return cb(null);
                }

                // Check if we need to use it all
                let toWrite;
                if (writeEnd > chunk.length) {
                  this._position += chunk.length;
                  if (writeStart === 0) {
                    toWrite = chunk;
                  } else {
                    toWrite = chunk.slice(writeStart);
                  }
                  drained = currRange.stream.write(toWrite) && drained;
                  break;
                }

                this._position += writeEnd;

                toWrite =
                  writeStart === 0 && writeEnd === chunk.length
                    ? chunk
                    : chunk.slice(writeStart, writeEnd);

                drained = currRange.stream.write(toWrite) && drained;
                if (currRange.last) {
                  currRange.stream.end();
                }
                chunk = chunk.slice(writeEnd);
                this._queue.shift();
              }

              if (drained) {
                cb(null);
              } else {
                currRange.stream.once("drain", cb.bind(null, null));
              }
            }

            slice(ranges) {
              if (this.destroyed) return null;

              if (!Array.isArray(ranges)) ranges = [ranges];

              const str = new PassThrough();

              ranges.forEach((range, i) => {
                this._queue.push({
                  start: range.start,
                  end: range.end,
                  stream: str,
                  last: i === ranges.length - 1,
                });
              });

              if (this._buffer) {
                this._write(this._buffer, null, this._cb);
              }

              return str;
            }

            destroy(err) {
              if (this.destroyed) return;
              this.destroyed = true;

              if (err) this.emit("error", err);
            }
          }

          module.exports = RangeSliceStream;
        },
        { "readable-stream": 49 },
      ],
      35: [
        function (require, module, exports) {
          "use strict";

          function _inheritsLoose(subClass, superClass) {
            subClass.prototype = Object.create(superClass.prototype);
            subClass.prototype.constructor = subClass;
            subClass.__proto__ = superClass;
          }

          var codes = {};

          function createErrorType(code, message, Base) {
            if (!Base) {
              Base = Error;
            }

            function getMessage(arg1, arg2, arg3) {
              if (typeof message === "string") {
                return message;
              } else {
                return message(arg1, arg2, arg3);
              }
            }

            var NodeError =
              /*#__PURE__*/
              (function (_Base) {
                _inheritsLoose(NodeError, _Base);

                function NodeError(arg1, arg2, arg3) {
                  return _Base.call(this, getMessage(arg1, arg2, arg3)) || this;
                }

                return NodeError;
              })(Base);

            NodeError.prototype.name = Base.name;
            NodeError.prototype.code = code;
            codes[code] = NodeError;
          } // https://github.com/nodejs/node/blob/v10.8.0/lib/internal/errors.js

          function oneOf(expected, thing) {
            if (Array.isArray(expected)) {
              var len = expected.length;
              expected = expected.map(function (i) {
                return String(i);
              });

              if (len > 2) {
                return (
                  "one of "
                    .concat(thing, " ")
                    .concat(expected.slice(0, len - 1).join(", "), ", or ") +
                  expected[len - 1]
                );
              } else if (len === 2) {
                return "one of "
                  .concat(thing, " ")
                  .concat(expected[0], " or ")
                  .concat(expected[1]);
              } else {
                return "of ".concat(thing, " ").concat(expected[0]);
              }
            } else {
              return "of ".concat(thing, " ").concat(String(expected));
            }
          } // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith

          function startsWith(str, search, pos) {
            return (
              str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search
            );
          } // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith

          function endsWith(str, search, this_len) {
            if (this_len === undefined || this_len > str.length) {
              this_len = str.length;
            }

            return str.substring(this_len - search.length, this_len) === search;
          } // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes

          function includes(str, search, start) {
            if (typeof start !== "number") {
              start = 0;
            }

            if (start + search.length > str.length) {
              return false;
            } else {
              return str.indexOf(search, start) !== -1;
            }
          }

          createErrorType(
            "ERR_INVALID_OPT_VALUE",
            function (name, value) {
              return (
                'The value "' + value + '" is invalid for option "' + name + '"'
              );
            },
            TypeError
          );
          createErrorType(
            "ERR_INVALID_ARG_TYPE",
            function (name, expected, actual) {
              // determiner: 'must be' or 'must not be'
              var determiner;

              if (
                typeof expected === "string" &&
                startsWith(expected, "not ")
              ) {
                determiner = "must not be";
                expected = expected.replace(/^not /, "");
              } else {
                determiner = "must be";
              }

              var msg;

              if (endsWith(name, " argument")) {
                // For cases like 'first argument'
                msg = "The "
                  .concat(name, " ")
                  .concat(determiner, " ")
                  .concat(oneOf(expected, "type"));
              } else {
                var type = includes(name, ".") ? "property" : "argument";
                msg = 'The "'
                  .concat(name, '" ')
                  .concat(type, " ")
                  .concat(determiner, " ")
                  .concat(oneOf(expected, "type"));
              }

              msg += ". Received type ".concat(typeof actual);
              return msg;
            },
            TypeError
          );
          createErrorType(
            "ERR_STREAM_PUSH_AFTER_EOF",
            "stream.push() after EOF"
          );
          createErrorType("ERR_METHOD_NOT_IMPLEMENTED", function (name) {
            return "The " + name + " method is not implemented";
          });
          createErrorType("ERR_STREAM_PREMATURE_CLOSE", "Premature close");
          createErrorType("ERR_STREAM_DESTROYED", function (name) {
            return "Cannot call " + name + " after a stream was destroyed";
          });
          createErrorType(
            "ERR_MULTIPLE_CALLBACK",
            "Callback called multiple times"
          );
          createErrorType(
            "ERR_STREAM_CANNOT_PIPE",
            "Cannot pipe, not readable"
          );
          createErrorType("ERR_STREAM_WRITE_AFTER_END", "write after end");
          createErrorType(
            "ERR_STREAM_NULL_VALUES",
            "May not write null values to stream",
            TypeError
          );
          createErrorType(
            "ERR_UNKNOWN_ENCODING",
            function (arg) {
              return "Unknown encoding: " + arg;
            },
            TypeError
          );
          createErrorType(
            "ERR_STREAM_UNSHIFT_AFTER_END_EVENT",
            "stream.unshift() after end event"
          );
          module.exports.codes = codes;
        },
        {},
      ],
      36: [
        function (require, module, exports) {
          (function (process) {
            (function () {
              // Copyright Joyent, Inc. and other Node contributors.
              //
              // Permission is hereby granted, free of charge, to any person obtaining a
              // copy of this software and associated documentation files (the
              // "Software"), to deal in the Software without restriction, including
              // without limitation the rights to use, copy, modify, merge, publish,
              // distribute, sublicense, and/or sell copies of the Software, and to permit
              // persons to whom the Software is furnished to do so, subject to the
              // following conditions:
              //
              // The above copyright notice and this permission notice shall be included
              // in all copies or substantial portions of the Software.
              //
              // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
              // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
              // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
              // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
              // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
              // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
              // USE OR OTHER DEALINGS IN THE SOFTWARE.
              // a duplex stream is just a stream that is both readable and writable.
              // Since JS doesn't have multiple prototypal inheritance, this class
              // prototypally inherits from Readable, and then parasitically from
              // Writable.
              "use strict";
              /*<replacement>*/

              var objectKeys =
                Object.keys ||
                function (obj) {
                  var keys = [];

                  for (var key in obj) {
                    keys.push(key);
                  }

                  return keys;
                };
              /*</replacement>*/

              module.exports = Duplex;

              var Readable = require("./_stream_readable");

              var Writable = require("./_stream_writable");

              require("inherits")(Duplex, Readable);

              {
                // Allow the keys array to be GC'ed.
                var keys = objectKeys(Writable.prototype);

                for (var v = 0; v < keys.length; v++) {
                  var method = keys[v];
                  if (!Duplex.prototype[method])
                    Duplex.prototype[method] = Writable.prototype[method];
                }
              }

              function Duplex(options) {
                if (!(this instanceof Duplex)) return new Duplex(options);
                Readable.call(this, options);
                Writable.call(this, options);
                this.allowHalfOpen = true;

                if (options) {
                  if (options.readable === false) this.readable = false;
                  if (options.writable === false) this.writable = false;

                  if (options.allowHalfOpen === false) {
                    this.allowHalfOpen = false;
                    this.once("end", onend);
                  }
                }
              }

              Object.defineProperty(Duplex.prototype, "writableHighWaterMark", {
                // making it explicit this property is not enumerable
                // because otherwise some prototype manipulation in
                // userland will fail
                enumerable: false,
                get: function get() {
                  return this._writableState.highWaterMark;
                },
              });
              Object.defineProperty(Duplex.prototype, "writableBuffer", {
                // making it explicit this property is not enumerable
                // because otherwise some prototype manipulation in
                // userland will fail
                enumerable: false,
                get: function get() {
                  return this._writableState && this._writableState.getBuffer();
                },
              });
              Object.defineProperty(Duplex.prototype, "writableLength", {
                // making it explicit this property is not enumerable
                // because otherwise some prototype manipulation in
                // userland will fail
                enumerable: false,
                get: function get() {
                  return this._writableState.length;
                },
              }); // the no-half-open enforcer

              function onend() {
                // If the writable side ended, then we're ok.
                if (this._writableState.ended) return; // no more data can be written.
                // But allow more writes to happen in this tick.

                process.nextTick(onEndNT, this);
              }

              function onEndNT(self) {
                self.end();
              }

              Object.defineProperty(Duplex.prototype, "destroyed", {
                // making it explicit this property is not enumerable
                // because otherwise some prototype manipulation in
                // userland will fail
                enumerable: false,
                get: function get() {
                  if (
                    this._readableState === undefined ||
                    this._writableState === undefined
                  ) {
                    return false;
                  }

                  return (
                    this._readableState.destroyed &&
                    this._writableState.destroyed
                  );
                },
                set: function set(value) {
                  // we ignore the value if the stream
                  // has not been initialized yet
                  if (
                    this._readableState === undefined ||
                    this._writableState === undefined
                  ) {
                    return;
                  } // backward compatibility, the user is explicitly
                  // managing destroyed

                  this._readableState.destroyed = value;
                  this._writableState.destroyed = value;
                },
              });
            }.call(this));
          }.call(this, require("_process")));
        },
        {
          "./_stream_readable": 38,
          "./_stream_writable": 40,
          _process: 30,
          inherits: 14,
        },
      ],
      37: [
        function (require, module, exports) {
          // Copyright Joyent, Inc. and other Node contributors.
          //
          // Permission is hereby granted, free of charge, to any person obtaining a
          // copy of this software and associated documentation files (the
          // "Software"), to deal in the Software without restriction, including
          // without limitation the rights to use, copy, modify, merge, publish,
          // distribute, sublicense, and/or sell copies of the Software, and to permit
          // persons to whom the Software is furnished to do so, subject to the
          // following conditions:
          //
          // The above copyright notice and this permission notice shall be included
          // in all copies or substantial portions of the Software.
          //
          // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
          // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
          // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
          // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
          // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
          // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
          // USE OR OTHER DEALINGS IN THE SOFTWARE.
          // a passthrough stream.
          // basically just the most minimal sort of Transform stream.
          // Every written chunk gets output as-is.
          "use strict";

          module.exports = PassThrough;

          var Transform = require("./_stream_transform");

          require("inherits")(PassThrough, Transform);

          function PassThrough(options) {
            if (!(this instanceof PassThrough)) return new PassThrough(options);
            Transform.call(this, options);
          }

          PassThrough.prototype._transform = function (chunk, encoding, cb) {
            cb(null, chunk);
          };
        },
        { "./_stream_transform": 39, inherits: 14 },
      ],
      38: [
        function (require, module, exports) {
          (function (process, global) {
            (function () {
              // Copyright Joyent, Inc. and other Node contributors.
              //
              // Permission is hereby granted, free of charge, to any person obtaining a
              // copy of this software and associated documentation files (the
              // "Software"), to deal in the Software without restriction, including
              // without limitation the rights to use, copy, modify, merge, publish,
              // distribute, sublicense, and/or sell copies of the Software, and to permit
              // persons to whom the Software is furnished to do so, subject to the
              // following conditions:
              //
              // The above copyright notice and this permission notice shall be included
              // in all copies or substantial portions of the Software.
              //
              // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
              // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
              // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
              // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
              // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
              // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
              // USE OR OTHER DEALINGS IN THE SOFTWARE.
              "use strict";

              module.exports = Readable;
              /*<replacement>*/

              var Duplex;
              /*</replacement>*/

              Readable.ReadableState = ReadableState;
              /*<replacement>*/

              var EE = require("events").EventEmitter;

              var EElistenerCount = function EElistenerCount(emitter, type) {
                return emitter.listeners(type).length;
              };
              /*</replacement>*/

              /*<replacement>*/

              var Stream = require("./internal/streams/stream");
              /*</replacement>*/

              var Buffer = require("buffer").Buffer;

              var OurUint8Array = global.Uint8Array || function () {};

              function _uint8ArrayToBuffer(chunk) {
                return Buffer.from(chunk);
              }

              function _isUint8Array(obj) {
                return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
              }
              /*<replacement>*/

              var debugUtil = require("util");

              var debug;

              if (debugUtil && debugUtil.debuglog) {
                debug = debugUtil.debuglog("stream");
              } else {
                debug = function debug() {};
              }
              /*</replacement>*/

              var BufferList = require("./internal/streams/buffer_list");

              var destroyImpl = require("./internal/streams/destroy");

              var _require = require("./internal/streams/state"),
                getHighWaterMark = _require.getHighWaterMark;

              var _require$codes = require("../errors").codes,
                ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
                ERR_STREAM_PUSH_AFTER_EOF =
                  _require$codes.ERR_STREAM_PUSH_AFTER_EOF,
                ERR_METHOD_NOT_IMPLEMENTED =
                  _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
                ERR_STREAM_UNSHIFT_AFTER_END_EVENT =
                  _require$codes.ERR_STREAM_UNSHIFT_AFTER_END_EVENT; // Lazy loaded to improve the startup performance.

              var StringDecoder;
              var createReadableStreamAsyncIterator;
              var from;

              require("inherits")(Readable, Stream);

              var errorOrDestroy = destroyImpl.errorOrDestroy;
              var kProxyEvents = [
                "error",
                "close",
                "destroy",
                "pause",
                "resume",
              ];

              function prependListener(emitter, event, fn) {
                // Sadly this is not cacheable as some libraries bundle their own
                // event emitter implementation with them.
                if (typeof emitter.prependListener === "function")
                  return emitter.prependListener(event, fn); // This is a hack to make sure that our error handler is attached before any
                // userland ones.  NEVER DO THIS. This is here only because this code needs
                // to continue to work with older versions of Node.js that do not include
                // the prependListener() method. The goal is to eventually remove this hack.

                if (!emitter._events || !emitter._events[event])
                  emitter.on(event, fn);
                else if (Array.isArray(emitter._events[event]))
                  emitter._events[event].unshift(fn);
                else emitter._events[event] = [fn, emitter._events[event]];
              }

              function ReadableState(options, stream, isDuplex) {
                Duplex = Duplex || require("./_stream_duplex");
                options = options || {}; // Duplex streams are both readable and writable, but share
                // the same options object.
                // However, some cases require setting options to different
                // values for the readable and the writable sides of the duplex stream.
                // These options can be provided separately as readableXXX and writableXXX.

                if (typeof isDuplex !== "boolean")
                  isDuplex = stream instanceof Duplex; // object stream flag. Used to make read(n) ignore n and to
                // make all the buffer merging and length checks go away

                this.objectMode = !!options.objectMode;
                if (isDuplex)
                  this.objectMode =
                    this.objectMode || !!options.readableObjectMode; // the point at which it stops calling _read() to fill the buffer
                // Note: 0 is a valid value, means "don't call _read preemptively ever"

                this.highWaterMark = getHighWaterMark(
                  this,
                  options,
                  "readableHighWaterMark",
                  isDuplex
                ); // A linked list is used to store data chunks instead of an array because the
                // linked list can remove elements from the beginning faster than
                // array.shift()

                this.buffer = new BufferList();
                this.length = 0;
                this.pipes = null;
                this.pipesCount = 0;
                this.flowing = null;
                this.ended = false;
                this.endEmitted = false;
                this.reading = false; // a flag to be able to tell if the event 'readable'/'data' is emitted
                // immediately, or on a later tick.  We set this to true at first, because
                // any actions that shouldn't happen until "later" should generally also
                // not happen before the first read call.

                this.sync = true; // whenever we return null, then we set a flag to say
                // that we're awaiting a 'readable' event emission.

                this.needReadable = false;
                this.emittedReadable = false;
                this.readableListening = false;
                this.resumeScheduled = false;
                this.paused = true; // Should close be emitted on destroy. Defaults to true.

                this.emitClose = options.emitClose !== false; // Should .destroy() be called after 'end' (and potentially 'finish')

                this.autoDestroy = !!options.autoDestroy; // has it been destroyed

                this.destroyed = false; // Crypto is kind of old and crusty.  Historically, its default string
                // encoding is 'binary' so we have to make this configurable.
                // Everything else in the universe uses 'utf8', though.

                this.defaultEncoding = options.defaultEncoding || "utf8"; // the number of writers that are awaiting a drain event in .pipe()s

                this.awaitDrain = 0; // if true, a maybeReadMore has been scheduled

                this.readingMore = false;
                this.decoder = null;
                this.encoding = null;

                if (options.encoding) {
                  if (!StringDecoder)
                    StringDecoder = require("string_decoder/").StringDecoder;
                  this.decoder = new StringDecoder(options.encoding);
                  this.encoding = options.encoding;
                }
              }

              function Readable(options) {
                Duplex = Duplex || require("./_stream_duplex");
                if (!(this instanceof Readable)) return new Readable(options); // Checking for a Stream.Duplex instance is faster here instead of inside
                // the ReadableState constructor, at least with V8 6.5

                var isDuplex = this instanceof Duplex;
                this._readableState = new ReadableState(
                  options,
                  this,
                  isDuplex
                ); // legacy

                this.readable = true;

                if (options) {
                  if (typeof options.read === "function")
                    this._read = options.read;
                  if (typeof options.destroy === "function")
                    this._destroy = options.destroy;
                }

                Stream.call(this);
              }

              Object.defineProperty(Readable.prototype, "destroyed", {
                // making it explicit this property is not enumerable
                // because otherwise some prototype manipulation in
                // userland will fail
                enumerable: false,
                get: function get() {
                  if (this._readableState === undefined) {
                    return false;
                  }

                  return this._readableState.destroyed;
                },
                set: function set(value) {
                  // we ignore the value if the stream
                  // has not been initialized yet
                  if (!this._readableState) {
                    return;
                  } // backward compatibility, the user is explicitly
                  // managing destroyed

                  this._readableState.destroyed = value;
                },
              });
              Readable.prototype.destroy = destroyImpl.destroy;
              Readable.prototype._undestroy = destroyImpl.undestroy;

              Readable.prototype._destroy = function (err, cb) {
                cb(err);
              }; // Manually shove something into the read() buffer.
              // This returns true if the highWaterMark has not been hit yet,
              // similar to how Writable.write() returns true if you should
              // write() some more.

              Readable.prototype.push = function (chunk, encoding) {
                var state = this._readableState;
                var skipChunkCheck;

                if (!state.objectMode) {
                  if (typeof chunk === "string") {
                    encoding = encoding || state.defaultEncoding;

                    if (encoding !== state.encoding) {
                      chunk = Buffer.from(chunk, encoding);
                      encoding = "";
                    }

                    skipChunkCheck = true;
                  }
                } else {
                  skipChunkCheck = true;
                }

                return readableAddChunk(
                  this,
                  chunk,
                  encoding,
                  false,
                  skipChunkCheck
                );
              }; // Unshift should *always* be something directly out of read()

              Readable.prototype.unshift = function (chunk) {
                return readableAddChunk(this, chunk, null, true, false);
              };

              function readableAddChunk(
                stream,
                chunk,
                encoding,
                addToFront,
                skipChunkCheck
              ) {
                debug("readableAddChunk", chunk);
                var state = stream._readableState;

                if (chunk === null) {
                  state.reading = false;
                  onEofChunk(stream, state);
                } else {
                  var er;
                  if (!skipChunkCheck) er = chunkInvalid(state, chunk);

                  if (er) {
                    errorOrDestroy(stream, er);
                  } else if (state.objectMode || (chunk && chunk.length > 0)) {
                    if (
                      typeof chunk !== "string" &&
                      !state.objectMode &&
                      Object.getPrototypeOf(chunk) !== Buffer.prototype
                    ) {
                      chunk = _uint8ArrayToBuffer(chunk);
                    }

                    if (addToFront) {
                      if (state.endEmitted)
                        errorOrDestroy(
                          stream,
                          new ERR_STREAM_UNSHIFT_AFTER_END_EVENT()
                        );
                      else addChunk(stream, state, chunk, true);
                    } else if (state.ended) {
                      errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
                    } else if (state.destroyed) {
                      return false;
                    } else {
                      state.reading = false;

                      if (state.decoder && !encoding) {
                        chunk = state.decoder.write(chunk);
                        if (state.objectMode || chunk.length !== 0)
                          addChunk(stream, state, chunk, false);
                        else maybeReadMore(stream, state);
                      } else {
                        addChunk(stream, state, chunk, false);
                      }
                    }
                  } else if (!addToFront) {
                    state.reading = false;
                    maybeReadMore(stream, state);
                  }
                } // We can push more data if we are below the highWaterMark.
                // Also, if we have no data yet, we can stand some more bytes.
                // This is to work around cases where hwm=0, such as the repl.

                return (
                  !state.ended &&
                  (state.length < state.highWaterMark || state.length === 0)
                );
              }

              function addChunk(stream, state, chunk, addToFront) {
                if (state.flowing && state.length === 0 && !state.sync) {
                  state.awaitDrain = 0;
                  stream.emit("data", chunk);
                } else {
                  // update the buffer info.
                  state.length += state.objectMode ? 1 : chunk.length;
                  if (addToFront) state.buffer.unshift(chunk);
                  else state.buffer.push(chunk);
                  if (state.needReadable) emitReadable(stream);
                }

                maybeReadMore(stream, state);
              }

              function chunkInvalid(state, chunk) {
                var er;

                if (
                  !_isUint8Array(chunk) &&
                  typeof chunk !== "string" &&
                  chunk !== undefined &&
                  !state.objectMode
                ) {
                  er = new ERR_INVALID_ARG_TYPE(
                    "chunk",
                    ["string", "Buffer", "Uint8Array"],
                    chunk
                  );
                }

                return er;
              }

              Readable.prototype.isPaused = function () {
                return this._readableState.flowing === false;
              }; // backwards compatibility.

              Readable.prototype.setEncoding = function (enc) {
                if (!StringDecoder)
                  StringDecoder = require("string_decoder/").StringDecoder;
                var decoder = new StringDecoder(enc);
                this._readableState.decoder = decoder; // If setEncoding(null), decoder.encoding equals utf8

                this._readableState.encoding =
                  this._readableState.decoder.encoding; // Iterate over current buffer to convert already stored Buffers:

                var p = this._readableState.buffer.head;
                var content = "";

                while (p !== null) {
                  content += decoder.write(p.data);
                  p = p.next;
                }

                this._readableState.buffer.clear();

                if (content !== "") this._readableState.buffer.push(content);
                this._readableState.length = content.length;
                return this;
              }; // Don't raise the hwm > 1GB

              var MAX_HWM = 0x40000000;

              function computeNewHighWaterMark(n) {
                if (n >= MAX_HWM) {
                  // TODO(ronag): Throw ERR_VALUE_OUT_OF_RANGE.
                  n = MAX_HWM;
                } else {
                  // Get the next highest power of 2 to prevent increasing hwm excessively in
                  // tiny amounts
                  n--;
                  n |= n >>> 1;
                  n |= n >>> 2;
                  n |= n >>> 4;
                  n |= n >>> 8;
                  n |= n >>> 16;
                  n++;
                }

                return n;
              } // This function is designed to be inlinable, so please take care when making
              // changes to the function body.

              function howMuchToRead(n, state) {
                if (n <= 0 || (state.length === 0 && state.ended)) return 0;
                if (state.objectMode) return 1;

                if (n !== n) {
                  // Only flow one buffer at a time
                  if (state.flowing && state.length)
                    return state.buffer.head.data.length;
                  else return state.length;
                } // If we're asking for more than the current hwm, then raise the hwm.

                if (n > state.highWaterMark)
                  state.highWaterMark = computeNewHighWaterMark(n);
                if (n <= state.length) return n; // Don't have enough

                if (!state.ended) {
                  state.needReadable = true;
                  return 0;
                }

                return state.length;
              } // you can override either this method, or the async _read(n) below.

              Readable.prototype.read = function (n) {
                debug("read", n);
                n = parseInt(n, 10);
                var state = this._readableState;
                var nOrig = n;
                if (n !== 0) state.emittedReadable = false; // if we're doing read(0) to trigger a readable event, but we
                // already have a bunch of data in the buffer, then just trigger
                // the 'readable' event and move on.

                if (
                  n === 0 &&
                  state.needReadable &&
                  ((state.highWaterMark !== 0
                    ? state.length >= state.highWaterMark
                    : state.length > 0) ||
                    state.ended)
                ) {
                  debug("read: emitReadable", state.length, state.ended);
                  if (state.length === 0 && state.ended) endReadable(this);
                  else emitReadable(this);
                  return null;
                }

                n = howMuchToRead(n, state); // if we've ended, and we're now clear, then finish it up.

                if (n === 0 && state.ended) {
                  if (state.length === 0) endReadable(this);
                  return null;
                } // All the actual chunk generation logic needs to be
                // *below* the call to _read.  The reason is that in certain
                // synthetic stream cases, such as passthrough streams, _read
                // may be a completely synchronous operation which may change
                // the state of the read buffer, providing enough data when
                // before there was *not* enough.
                //
                // So, the steps are:
                // 1. Figure out what the state of things will be after we do
                // a read from the buffer.
                //
                // 2. If that resulting state will trigger a _read, then call _read.
                // Note that this may be asynchronous, or synchronous.  Yes, it is
                // deeply ugly to write APIs this way, but that still doesn't mean
                // that the Readable class should behave improperly, as streams are
                // designed to be sync/async agnostic.
                // Take note if the _read call is sync or async (ie, if the read call
                // has returned yet), so that we know whether or not it's safe to emit
                // 'readable' etc.
                //
                // 3. Actually pull the requested chunks out of the buffer and return.
                // if we need a readable event, then we need to do some reading.

                var doRead = state.needReadable;
                debug("need readable", doRead); // if we currently have less than the highWaterMark, then also read some

                if (
                  state.length === 0 ||
                  state.length - n < state.highWaterMark
                ) {
                  doRead = true;
                  debug("length less than watermark", doRead);
                } // however, if we've ended, then there's no point, and if we're already
                // reading, then it's unnecessary.

                if (state.ended || state.reading) {
                  doRead = false;
                  debug("reading or ended", doRead);
                } else if (doRead) {
                  debug("do read");
                  state.reading = true;
                  state.sync = true; // if the length is currently zero, then we *need* a readable event.

                  if (state.length === 0) state.needReadable = true; // call internal read method

                  this._read(state.highWaterMark);

                  state.sync = false; // If _read pushed data synchronously, then `reading` will be false,
                  // and we need to re-evaluate how much data we can return to the user.

                  if (!state.reading) n = howMuchToRead(nOrig, state);
                }

                var ret;
                if (n > 0) ret = fromList(n, state);
                else ret = null;

                if (ret === null) {
                  state.needReadable = state.length <= state.highWaterMark;
                  n = 0;
                } else {
                  state.length -= n;
                  state.awaitDrain = 0;
                }

                if (state.length === 0) {
                  // If we have nothing in the buffer, then we want to know
                  // as soon as we *do* get something into the buffer.
                  if (!state.ended) state.needReadable = true; // If we tried to read() past the EOF, then emit end on the next tick.

                  if (nOrig !== n && state.ended) endReadable(this);
                }

                if (ret !== null) this.emit("data", ret);
                return ret;
              };

              function onEofChunk(stream, state) {
                debug("onEofChunk");
                if (state.ended) return;

                if (state.decoder) {
                  var chunk = state.decoder.end();

                  if (chunk && chunk.length) {
                    state.buffer.push(chunk);
                    state.length += state.objectMode ? 1 : chunk.length;
                  }
                }

                state.ended = true;

                if (state.sync) {
                  // if we are sync, wait until next tick to emit the data.
                  // Otherwise we risk emitting data in the flow()
                  // the readable code triggers during a read() call
                  emitReadable(stream);
                } else {
                  // emit 'readable' now to make sure it gets picked up.
                  state.needReadable = false;

                  if (!state.emittedReadable) {
                    state.emittedReadable = true;
                    emitReadable_(stream);
                  }
                }
              } // Don't emit readable right away in sync mode, because this can trigger
              // another read() call => stack overflow.  This way, it might trigger
              // a nextTick recursion warning, but that's not so bad.

              function emitReadable(stream) {
                var state = stream._readableState;
                debug(
                  "emitReadable",
                  state.needReadable,
                  state.emittedReadable
                );
                state.needReadable = false;

                if (!state.emittedReadable) {
                  debug("emitReadable", state.flowing);
                  state.emittedReadable = true;
                  process.nextTick(emitReadable_, stream);
                }
              }

              function emitReadable_(stream) {
                var state = stream._readableState;
                debug(
                  "emitReadable_",
                  state.destroyed,
                  state.length,
                  state.ended
                );

                if (!state.destroyed && (state.length || state.ended)) {
                  stream.emit("readable");
                  state.emittedReadable = false;
                } // The stream needs another readable event if
                // 1. It is not flowing, as the flow mechanism will take
                //    care of it.
                // 2. It is not ended.
                // 3. It is below the highWaterMark, so we can schedule
                //    another readable later.

                state.needReadable =
                  !state.flowing &&
                  !state.ended &&
                  state.length <= state.highWaterMark;
                flow(stream);
              } // at this point, the user has presumably seen the 'readable' event,
              // and called read() to consume some data.  that may have triggered
              // in turn another _read(n) call, in which case reading = true if
              // it's in progress.
              // However, if we're not ended, or reading, and the length < hwm,
              // then go ahead and try to read some more preemptively.

              function maybeReadMore(stream, state) {
                if (!state.readingMore) {
                  state.readingMore = true;
                  process.nextTick(maybeReadMore_, stream, state);
                }
              }

              function maybeReadMore_(stream, state) {
                // Attempt to read more data if we should.
                //
                // The conditions for reading more data are (one of):
                // - Not enough data buffered (state.length < state.highWaterMark). The loop
                //   is responsible for filling the buffer with enough data if such data
                //   is available. If highWaterMark is 0 and we are not in the flowing mode
                //   we should _not_ attempt to buffer any extra data. We'll get more data
                //   when the stream consumer calls read() instead.
                // - No data in the buffer, and the stream is in flowing mode. In this mode
                //   the loop below is responsible for ensuring read() is called. Failing to
                //   call read here would abort the flow and there's no other mechanism for
                //   continuing the flow if the stream consumer has just subscribed to the
                //   'data' event.
                //
                // In addition to the above conditions to keep reading data, the following
                // conditions prevent the data from being read:
                // - The stream has ended (state.ended).
                // - There is already a pending 'read' operation (state.reading). This is a
                //   case where the the stream has called the implementation defined _read()
                //   method, but they are processing the call asynchronously and have _not_
                //   called push() with new data. In this case we skip performing more
                //   read()s. The execution ends in this method again after the _read() ends
                //   up calling push() with more data.
                while (
                  !state.reading &&
                  !state.ended &&
                  (state.length < state.highWaterMark ||
                    (state.flowing && state.length === 0))
                ) {
                  var len = state.length;
                  debug("maybeReadMore read 0");
                  stream.read(0);
                  if (len === state.length)
                    // didn't get any data, stop spinning.
                    break;
                }

                state.readingMore = false;
              } // abstract method.  to be overridden in specific implementation classes.
              // call cb(er, data) where data is <= n in length.
              // for virtual (non-string, non-buffer) streams, "length" is somewhat
              // arbitrary, and perhaps not very meaningful.

              Readable.prototype._read = function (n) {
                errorOrDestroy(this, new ERR_METHOD_NOT_IMPLEMENTED("_read()"));
              };

              Readable.prototype.pipe = function (dest, pipeOpts) {
                var src = this;
                var state = this._readableState;

                switch (state.pipesCount) {
                  case 0:
                    state.pipes = dest;
                    break;

                  case 1:
                    state.pipes = [state.pipes, dest];
                    break;

                  default:
                    state.pipes.push(dest);
                    break;
                }

                state.pipesCount += 1;
                debug("pipe count=%d opts=%j", state.pipesCount, pipeOpts);
                var doEnd =
                  (!pipeOpts || pipeOpts.end !== false) &&
                  dest !== process.stdout &&
                  dest !== process.stderr;
                var endFn = doEnd ? onend : unpipe;
                if (state.endEmitted) process.nextTick(endFn);
                else src.once("end", endFn);
                dest.on("unpipe", onunpipe);

                function onunpipe(readable, unpipeInfo) {
                  debug("onunpipe");

                  if (readable === src) {
                    if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
                      unpipeInfo.hasUnpiped = true;
                      cleanup();
                    }
                  }
                }

                function onend() {
                  debug("onend");
                  dest.end();
                } // when the dest drains, it reduces the awaitDrain counter
                // on the source.  This would be more elegant with a .once()
                // handler in flow(), but adding and removing repeatedly is
                // too slow.

                var ondrain = pipeOnDrain(src);
                dest.on("drain", ondrain);
                var cleanedUp = false;

                function cleanup() {
                  debug("cleanup"); // cleanup event handlers once the pipe is broken

                  dest.removeListener("close", onclose);
                  dest.removeListener("finish", onfinish);
                  dest.removeListener("drain", ondrain);
                  dest.removeListener("error", onerror);
                  dest.removeListener("unpipe", onunpipe);
                  src.removeListener("end", onend);
                  src.removeListener("end", unpipe);
                  src.removeListener("data", ondata);
                  cleanedUp = true; // if the reader is waiting for a drain event from this
                  // specific writer, then it would cause it to never start
                  // flowing again.
                  // So, if this is awaiting a drain, then we just call it now.
                  // If we don't know, then assume that we are waiting for one.

                  if (
                    state.awaitDrain &&
                    (!dest._writableState || dest._writableState.needDrain)
                  )
                    ondrain();
                }

                src.on("data", ondata);

                function ondata(chunk) {
                  debug("ondata");
                  var ret = dest.write(chunk);
                  debug("dest.write", ret);

                  if (ret === false) {
                    // If the user unpiped during `dest.write()`, it is possible
                    // to get stuck in a permanently paused state if that write
                    // also returned false.
                    // => Check whether `dest` is still a piping destination.
                    if (
                      ((state.pipesCount === 1 && state.pipes === dest) ||
                        (state.pipesCount > 1 &&
                          indexOf(state.pipes, dest) !== -1)) &&
                      !cleanedUp
                    ) {
                      debug("false write response, pause", state.awaitDrain);
                      state.awaitDrain++;
                    }

                    src.pause();
                  }
                } // if the dest has an error, then stop piping into it.
                // however, don't suppress the throwing behavior for this.

                function onerror(er) {
                  debug("onerror", er);
                  unpipe();
                  dest.removeListener("error", onerror);
                  if (EElistenerCount(dest, "error") === 0)
                    errorOrDestroy(dest, er);
                } // Make sure our error handler is attached before userland ones.

                prependListener(dest, "error", onerror); // Both close and finish should trigger unpipe, but only once.

                function onclose() {
                  dest.removeListener("finish", onfinish);
                  unpipe();
                }

                dest.once("close", onclose);

                function onfinish() {
                  debug("onfinish");
                  dest.removeListener("close", onclose);
                  unpipe();
                }

                dest.once("finish", onfinish);

                function unpipe() {
                  debug("unpipe");
                  src.unpipe(dest);
                } // tell the dest that it's being piped to

                dest.emit("pipe", src); // start the flow if it hasn't been started already.

                if (!state.flowing) {
                  debug("pipe resume");
                  src.resume();
                }

                return dest;
              };

              function pipeOnDrain(src) {
                return function pipeOnDrainFunctionResult() {
                  var state = src._readableState;
                  debug("pipeOnDrain", state.awaitDrain);
                  if (state.awaitDrain) state.awaitDrain--;

                  if (state.awaitDrain === 0 && EElistenerCount(src, "data")) {
                    state.flowing = true;
                    flow(src);
                  }
                };
              }

              Readable.prototype.unpipe = function (dest) {
                var state = this._readableState;
                var unpipeInfo = {
                  hasUnpiped: false,
                }; // if we're not piping anywhere, then do nothing.

                if (state.pipesCount === 0) return this; // just one destination.  most common case.

                if (state.pipesCount === 1) {
                  // passed in one, but it's not the right one.
                  if (dest && dest !== state.pipes) return this;
                  if (!dest) dest = state.pipes; // got a match.

                  state.pipes = null;
                  state.pipesCount = 0;
                  state.flowing = false;
                  if (dest) dest.emit("unpipe", this, unpipeInfo);
                  return this;
                } // slow case. multiple pipe destinations.

                if (!dest) {
                  // remove all.
                  var dests = state.pipes;
                  var len = state.pipesCount;
                  state.pipes = null;
                  state.pipesCount = 0;
                  state.flowing = false;

                  for (var i = 0; i < len; i++) {
                    dests[i].emit("unpipe", this, {
                      hasUnpiped: false,
                    });
                  }

                  return this;
                } // try to find the right one.

                var index = indexOf(state.pipes, dest);
                if (index === -1) return this;
                state.pipes.splice(index, 1);
                state.pipesCount -= 1;
                if (state.pipesCount === 1) state.pipes = state.pipes[0];
                dest.emit("unpipe", this, unpipeInfo);
                return this;
              }; // set up data events if they are asked for
              // Ensure readable listeners eventually get something

              Readable.prototype.on = function (ev, fn) {
                var res = Stream.prototype.on.call(this, ev, fn);
                var state = this._readableState;

                if (ev === "data") {
                  // update readableListening so that resume() may be a no-op
                  // a few lines down. This is needed to support once('readable').
                  state.readableListening = this.listenerCount("readable") > 0; // Try start flowing on next tick if stream isn't explicitly paused

                  if (state.flowing !== false) this.resume();
                } else if (ev === "readable") {
                  if (!state.endEmitted && !state.readableListening) {
                    state.readableListening = state.needReadable = true;
                    state.flowing = false;
                    state.emittedReadable = false;
                    debug("on readable", state.length, state.reading);

                    if (state.length) {
                      emitReadable(this);
                    } else if (!state.reading) {
                      process.nextTick(nReadingNextTick, this);
                    }
                  }
                }

                return res;
              };

              Readable.prototype.addListener = Readable.prototype.on;

              Readable.prototype.removeListener = function (ev, fn) {
                var res = Stream.prototype.removeListener.call(this, ev, fn);

                if (ev === "readable") {
                  // We need to check if there is someone still listening to
                  // readable and reset the state. However this needs to happen
                  // after readable has been emitted but before I/O (nextTick) to
                  // support once('readable', fn) cycles. This means that calling
                  // resume within the same tick will have no
                  // effect.
                  process.nextTick(updateReadableListening, this);
                }

                return res;
              };

              Readable.prototype.removeAllListeners = function (ev) {
                var res = Stream.prototype.removeAllListeners.apply(
                  this,
                  arguments
                );

                if (ev === "readable" || ev === undefined) {
                  // We need to check if there is someone still listening to
                  // readable and reset the state. However this needs to happen
                  // after readable has been emitted but before I/O (nextTick) to
                  // support once('readable', fn) cycles. This means that calling
                  // resume within the same tick will have no
                  // effect.
                  process.nextTick(updateReadableListening, this);
                }

                return res;
              };

              function updateReadableListening(self) {
                var state = self._readableState;
                state.readableListening = self.listenerCount("readable") > 0;

                if (state.resumeScheduled && !state.paused) {
                  // flowing needs to be set to true now, otherwise
                  // the upcoming resume will not flow.
                  state.flowing = true; // crude way to check if we should resume
                } else if (self.listenerCount("data") > 0) {
                  self.resume();
                }
              }

              function nReadingNextTick(self) {
                debug("readable nexttick read 0");
                self.read(0);
              } // pause() and resume() are remnants of the legacy readable stream API
              // If the user uses them, then switch into old mode.

              Readable.prototype.resume = function () {
                var state = this._readableState;

                if (!state.flowing) {
                  debug("resume"); // we flow only if there is no one listening
                  // for readable, but we still have to call
                  // resume()

                  state.flowing = !state.readableListening;
                  resume(this, state);
                }

                state.paused = false;
                return this;
              };

              function resume(stream, state) {
                if (!state.resumeScheduled) {
                  state.resumeScheduled = true;
                  process.nextTick(resume_, stream, state);
                }
              }

              function resume_(stream, state) {
                debug("resume", state.reading);

                if (!state.reading) {
                  stream.read(0);
                }

                state.resumeScheduled = false;
                stream.emit("resume");
                flow(stream);
                if (state.flowing && !state.reading) stream.read(0);
              }

              Readable.prototype.pause = function () {
                debug("call pause flowing=%j", this._readableState.flowing);

                if (this._readableState.flowing !== false) {
                  debug("pause");
                  this._readableState.flowing = false;
                  this.emit("pause");
                }

                this._readableState.paused = true;
                return this;
              };

              function flow(stream) {
                var state = stream._readableState;
                debug("flow", state.flowing);

                while (state.flowing && stream.read() !== null) {}
              } // wrap an old-style stream as the async data source.
              // This is *not* part of the readable stream interface.
              // It is an ugly unfortunate mess of history.

              Readable.prototype.wrap = function (stream) {
                var _this = this;

                var state = this._readableState;
                var paused = false;
                stream.on("end", function () {
                  debug("wrapped end");

                  if (state.decoder && !state.ended) {
                    var chunk = state.decoder.end();
                    if (chunk && chunk.length) _this.push(chunk);
                  }

                  _this.push(null);
                });
                stream.on("data", function (chunk) {
                  debug("wrapped data");
                  if (state.decoder) chunk = state.decoder.write(chunk); // don't skip over falsy values in objectMode

                  if (
                    state.objectMode &&
                    (chunk === null || chunk === undefined)
                  )
                    return;
                  else if (!state.objectMode && (!chunk || !chunk.length))
                    return;

                  var ret = _this.push(chunk);

                  if (!ret) {
                    paused = true;
                    stream.pause();
                  }
                }); // proxy all the other methods.
                // important when wrapping filters and duplexes.

                for (var i in stream) {
                  if (
                    this[i] === undefined &&
                    typeof stream[i] === "function"
                  ) {
                    this[i] = (function methodWrap(method) {
                      return function methodWrapReturnFunction() {
                        return stream[method].apply(stream, arguments);
                      };
                    })(i);
                  }
                } // proxy certain important events.

                for (var n = 0; n < kProxyEvents.length; n++) {
                  stream.on(
                    kProxyEvents[n],
                    this.emit.bind(this, kProxyEvents[n])
                  );
                } // when we try to consume some more bytes, simply unpause the
                // underlying stream.

                this._read = function (n) {
                  debug("wrapped _read", n);

                  if (paused) {
                    paused = false;
                    stream.resume();
                  }
                };

                return this;
              };

              if (typeof Symbol === "function") {
                Readable.prototype[Symbol.asyncIterator] = function () {
                  if (createReadableStreamAsyncIterator === undefined) {
                    createReadableStreamAsyncIterator = require("./internal/streams/async_iterator");
                  }

                  return createReadableStreamAsyncIterator(this);
                };
              }

              Object.defineProperty(
                Readable.prototype,
                "readableHighWaterMark",
                {
                  // making it explicit this property is not enumerable
                  // because otherwise some prototype manipulation in
                  // userland will fail
                  enumerable: false,
                  get: function get() {
                    return this._readableState.highWaterMark;
                  },
                }
              );
              Object.defineProperty(Readable.prototype, "readableBuffer", {
                // making it explicit this property is not enumerable
                // because otherwise some prototype manipulation in
                // userland will fail
                enumerable: false,
                get: function get() {
                  return this._readableState && this._readableState.buffer;
                },
              });
              Object.defineProperty(Readable.prototype, "readableFlowing", {
                // making it explicit this property is not enumerable
                // because otherwise some prototype manipulation in
                // userland will fail
                enumerable: false,
                get: function get() {
                  return this._readableState.flowing;
                },
                set: function set(state) {
                  if (this._readableState) {
                    this._readableState.flowing = state;
                  }
                },
              }); // exposed for testing purposes only.

              Readable._fromList = fromList;
              Object.defineProperty(Readable.prototype, "readableLength", {
                // making it explicit this property is not enumerable
                // because otherwise some prototype manipulation in
                // userland will fail
                enumerable: false,
                get: function get() {
                  return this._readableState.length;
                },
              }); // Pluck off n bytes from an array of buffers.
              // Length is the combined lengths of all the buffers in the list.
              // This function is designed to be inlinable, so please take care when making
              // changes to the function body.

              function fromList(n, state) {
                // nothing buffered
                if (state.length === 0) return null;
                var ret;
                if (state.objectMode) ret = state.buffer.shift();
                else if (!n || n >= state.length) {
                  // read it all, truncate the list
                  if (state.decoder) ret = state.buffer.join("");
                  else if (state.buffer.length === 1)
                    ret = state.buffer.first();
                  else ret = state.buffer.concat(state.length);
                  state.buffer.clear();
                } else {
                  // read part of list
                  ret = state.buffer.consume(n, state.decoder);
                }
                return ret;
              }

              function endReadable(stream) {
                var state = stream._readableState;
                debug("endReadable", state.endEmitted);

                if (!state.endEmitted) {
                  state.ended = true;
                  process.nextTick(endReadableNT, state, stream);
                }
              }

              function endReadableNT(state, stream) {
                debug("endReadableNT", state.endEmitted, state.length); // Check that we didn't get one last unshift.

                if (!state.endEmitted && state.length === 0) {
                  state.endEmitted = true;
                  stream.readable = false;
                  stream.emit("end");

                  if (state.autoDestroy) {
                    // In case of duplex streams we need a way to detect
                    // if the writable side is ready for autoDestroy as well
                    var wState = stream._writableState;

                    if (!wState || (wState.autoDestroy && wState.finished)) {
                      stream.destroy();
                    }
                  }
                }
              }

              if (typeof Symbol === "function") {
                Readable.from = function (iterable, opts) {
                  if (from === undefined) {
                    from = require("./internal/streams/from");
                  }

                  return from(Readable, iterable, opts);
                };
              }

              function indexOf(xs, x) {
                for (var i = 0, l = xs.length; i < l; i++) {
                  if (xs[i] === x) return i;
                }

                return -1;
              }
            }.call(this));
          }.call(
            this,
            require("_process"),
            typeof global !== "undefined"
              ? global
              : typeof self !== "undefined"
              ? self
              : typeof window !== "undefined"
              ? window
              : {}
          ));
        },
        {
          "../errors": 35,
          "./_stream_duplex": 36,
          "./internal/streams/async_iterator": 41,
          "./internal/streams/buffer_list": 42,
          "./internal/streams/destroy": 43,
          "./internal/streams/from": 45,
          "./internal/streams/state": 47,
          "./internal/streams/stream": 48,
          _process: 30,
          buffer: 7,
          events: 12,
          inherits: 14,
          "string_decoder/": 57,
          util: 3,
        },
      ],
      39: [
        function (require, module, exports) {
          // Copyright Joyent, Inc. and other Node contributors.
          //
          // Permission is hereby granted, free of charge, to any person obtaining a
          // copy of this software and associated documentation files (the
          // "Software"), to deal in the Software without restriction, including
          // without limitation the rights to use, copy, modify, merge, publish,
          // distribute, sublicense, and/or sell copies of the Software, and to permit
          // persons to whom the Software is furnished to do so, subject to the
          // following conditions:
          //
          // The above copyright notice and this permission notice shall be included
          // in all copies or substantial portions of the Software.
          //
          // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
          // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
          // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
          // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
          // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
          // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
          // USE OR OTHER DEALINGS IN THE SOFTWARE.
          // a transform stream is a readable/writable stream where you do
          // something with the data.  Sometimes it's called a "filter",
          // but that's not a great name for it, since that implies a thing where
          // some bits pass through, and others are simply ignored.  (That would
          // be a valid example of a transform, of course.)
          //
          // While the output is causally related to the input, it's not a
          // necessarily symmetric or synchronous transformation.  For example,
          // a zlib stream might take multiple plain-text writes(), and then
          // emit a single compressed chunk some time in the future.
          //
          // Here's how this works:
          //
          // The Transform stream has all the aspects of the readable and writable
          // stream classes.  When you write(chunk), that calls _write(chunk,cb)
          // internally, and returns false if there's a lot of pending writes
          // buffered up.  When you call read(), that calls _read(n) until
          // there's enough pending readable data buffered up.
          //
          // In a transform stream, the written data is placed in a buffer.  When
          // _read(n) is called, it transforms the queued up data, calling the
          // buffered _write cb's as it consumes chunks.  If consuming a single
          // written chunk would result in multiple output chunks, then the first
          // outputted bit calls the readcb, and subsequent chunks just go into
          // the read buffer, and will cause it to emit 'readable' if necessary.
          //
          // This way, back-pressure is actually determined by the reading side,
          // since _read has to be called to start processing a new chunk.  However,
          // a pathological inflate type of transform can cause excessive buffering
          // here.  For example, imagine a stream where every byte of input is
          // interpreted as an integer from 0-255, and then results in that many
          // bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
          // 1kb of data being output.  In this case, you could write a very small
          // amount of input, and end up with a very large amount of output.  In
          // such a pathological inflating mechanism, there'd be no way to tell
          // the system to stop doing the transform.  A single 4MB write could
          // cause the system to run out of memory.
          //
          // However, even in such a pathological case, only a single written chunk
          // would be consumed, and then the rest would wait (un-transformed) until
          // the results of the previous transformed chunk were consumed.
          "use strict";

          module.exports = Transform;

          var _require$codes = require("../errors").codes,
            ERR_METHOD_NOT_IMPLEMENTED =
              _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
            ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
            ERR_TRANSFORM_ALREADY_TRANSFORMING =
              _require$codes.ERR_TRANSFORM_ALREADY_TRANSFORMING,
            ERR_TRANSFORM_WITH_LENGTH_0 =
              _require$codes.ERR_TRANSFORM_WITH_LENGTH_0;

          var Duplex = require("./_stream_duplex");

          require("inherits")(Transform, Duplex);

          function afterTransform(er, data) {
            var ts = this._transformState;
            ts.transforming = false;
            var cb = ts.writecb;

            if (cb === null) {
              return this.emit("error", new ERR_MULTIPLE_CALLBACK());
            }

            ts.writechunk = null;
            ts.writecb = null;
            if (data != null)
              // single equals check for both `null` and `undefined`
              this.push(data);
            cb(er);
            var rs = this._readableState;
            rs.reading = false;

            if (rs.needReadable || rs.length < rs.highWaterMark) {
              this._read(rs.highWaterMark);
            }
          }

          function Transform(options) {
            if (!(this instanceof Transform)) return new Transform(options);
            Duplex.call(this, options);
            this._transformState = {
              afterTransform: afterTransform.bind(this),
              needTransform: false,
              transforming: false,
              writecb: null,
              writechunk: null,
              writeencoding: null,
            }; // start out asking for a readable event once data is transformed.

            this._readableState.needReadable = true; // we have implemented the _read method, and done the other things
            // that Readable wants before the first _read call, so unset the
            // sync guard flag.

            this._readableState.sync = false;

            if (options) {
              if (typeof options.transform === "function")
                this._transform = options.transform;
              if (typeof options.flush === "function")
                this._flush = options.flush;
            } // When the writable side finishes, then flush out anything remaining.

            this.on("prefinish", prefinish);
          }

          function prefinish() {
            var _this = this;

            if (
              typeof this._flush === "function" &&
              !this._readableState.destroyed
            ) {
              this._flush(function (er, data) {
                done(_this, er, data);
              });
            } else {
              done(this, null, null);
            }
          }

          Transform.prototype.push = function (chunk, encoding) {
            this._transformState.needTransform = false;
            return Duplex.prototype.push.call(this, chunk, encoding);
          }; // This is the part where you do stuff!
          // override this function in implementation classes.
          // 'chunk' is an input chunk.
          //
          // Call `push(newChunk)` to pass along transformed output
          // to the readable side.  You may call 'push' zero or more times.
          //
          // Call `cb(err)` when you are done with this chunk.  If you pass
          // an error, then that'll put the hurt on the whole operation.  If you
          // never call cb(), then you'll never get another chunk.

          Transform.prototype._transform = function (chunk, encoding, cb) {
            cb(new ERR_METHOD_NOT_IMPLEMENTED("_transform()"));
          };

          Transform.prototype._write = function (chunk, encoding, cb) {
            var ts = this._transformState;
            ts.writecb = cb;
            ts.writechunk = chunk;
            ts.writeencoding = encoding;

            if (!ts.transforming) {
              var rs = this._readableState;
              if (
                ts.needTransform ||
                rs.needReadable ||
                rs.length < rs.highWaterMark
              )
                this._read(rs.highWaterMark);
            }
          }; // Doesn't matter what the args are here.
          // _transform does all the work.
          // That we got here means that the readable side wants more data.

          Transform.prototype._read = function (n) {
            var ts = this._transformState;

            if (ts.writechunk !== null && !ts.transforming) {
              ts.transforming = true;

              this._transform(
                ts.writechunk,
                ts.writeencoding,
                ts.afterTransform
              );
            } else {
              // mark that we need a transform, so that any data that comes in
              // will get processed, now that we've asked for it.
              ts.needTransform = true;
            }
          };

          Transform.prototype._destroy = function (err, cb) {
            Duplex.prototype._destroy.call(this, err, function (err2) {
              cb(err2);
            });
          };

          function done(stream, er, data) {
            if (er) return stream.emit("error", er);
            if (data != null)
              // single equals check for both `null` and `undefined`
              stream.push(data); // TODO(BridgeAR): Write a test for these two error cases
            // if there's nothing in the write buffer, then that means
            // that nothing more will ever be provided

            if (stream._writableState.length)
              throw new ERR_TRANSFORM_WITH_LENGTH_0();
            if (stream._transformState.transforming)
              throw new ERR_TRANSFORM_ALREADY_TRANSFORMING();
            return stream.push(null);
          }
        },
        { "../errors": 35, "./_stream_duplex": 36, inherits: 14 },
      ],
      40: [
        function (require, module, exports) {
          (function (process, global) {
            (function () {
              // Copyright Joyent, Inc. and other Node contributors.
              //
              // Permission is hereby granted, free of charge, to any person obtaining a
              // copy of this software and associated documentation files (the
              // "Software"), to deal in the Software without restriction, including
              // without limitation the rights to use, copy, modify, merge, publish,
              // distribute, sublicense, and/or sell copies of the Software, and to permit
              // persons to whom the Software is furnished to do so, subject to the
              // following conditions:
              //
              // The above copyright notice and this permission notice shall be included
              // in all copies or substantial portions of the Software.
              //
              // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
              // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
              // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
              // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
              // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
              // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
              // USE OR OTHER DEALINGS IN THE SOFTWARE.
              // A bit simpler than readable streams.
              // Implement an async ._write(chunk, encoding, cb), and it'll handle all
              // the drain event emission and buffering.
              "use strict";

              module.exports = Writable;
              /* <replacement> */

              function WriteReq(chunk, encoding, cb) {
                this.chunk = chunk;
                this.encoding = encoding;
                this.callback = cb;
                this.next = null;
              } // It seems a linked list but it is not
              // there will be only 2 of these for each stream

              function CorkedRequest(state) {
                var _this = this;

                this.next = null;
                this.entry = null;

                this.finish = function () {
                  onCorkedFinish(_this, state);
                };
              }
              /* </replacement> */

              /*<replacement>*/

              var Duplex;
              /*</replacement>*/

              Writable.WritableState = WritableState;
              /*<replacement>*/

              var internalUtil = {
                deprecate: require("util-deprecate"),
              };
              /*</replacement>*/

              /*<replacement>*/

              var Stream = require("./internal/streams/stream");
              /*</replacement>*/

              var Buffer = require("buffer").Buffer;

              var OurUint8Array = global.Uint8Array || function () {};

              function _uint8ArrayToBuffer(chunk) {
                return Buffer.from(chunk);
              }

              function _isUint8Array(obj) {
                return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
              }

              var destroyImpl = require("./internal/streams/destroy");

              var _require = require("./internal/streams/state"),
                getHighWaterMark = _require.getHighWaterMark;

              var _require$codes = require("../errors").codes,
                ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
                ERR_METHOD_NOT_IMPLEMENTED =
                  _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
                ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
                ERR_STREAM_CANNOT_PIPE = _require$codes.ERR_STREAM_CANNOT_PIPE,
                ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED,
                ERR_STREAM_NULL_VALUES = _require$codes.ERR_STREAM_NULL_VALUES,
                ERR_STREAM_WRITE_AFTER_END =
                  _require$codes.ERR_STREAM_WRITE_AFTER_END,
                ERR_UNKNOWN_ENCODING = _require$codes.ERR_UNKNOWN_ENCODING;

              var errorOrDestroy = destroyImpl.errorOrDestroy;

              require("inherits")(Writable, Stream);

              function nop() {}

              function WritableState(options, stream, isDuplex) {
                Duplex = Duplex || require("./_stream_duplex");
                options = options || {}; // Duplex streams are both readable and writable, but share
                // the same options object.
                // However, some cases require setting options to different
                // values for the readable and the writable sides of the duplex stream,
                // e.g. options.readableObjectMode vs. options.writableObjectMode, etc.

                if (typeof isDuplex !== "boolean")
                  isDuplex = stream instanceof Duplex; // object stream flag to indicate whether or not this stream
                // contains buffers or objects.

                this.objectMode = !!options.objectMode;
                if (isDuplex)
                  this.objectMode =
                    this.objectMode || !!options.writableObjectMode; // the point at which write() starts returning false
                // Note: 0 is a valid value, means that we always return false if
                // the entire buffer is not flushed immediately on write()

                this.highWaterMark = getHighWaterMark(
                  this,
                  options,
                  "writableHighWaterMark",
                  isDuplex
                ); // if _final has been called

                this.finalCalled = false; // drain event flag.

                this.needDrain = false; // at the start of calling end()

                this.ending = false; // when end() has been called, and returned

                this.ended = false; // when 'finish' is emitted

                this.finished = false; // has it been destroyed

                this.destroyed = false; // should we decode strings into buffers before passing to _write?
                // this is here so that some node-core streams can optimize string
                // handling at a lower level.

                var noDecode = options.decodeStrings === false;
                this.decodeStrings = !noDecode; // Crypto is kind of old and crusty.  Historically, its default string
                // encoding is 'binary' so we have to make this configurable.
                // Everything else in the universe uses 'utf8', though.

                this.defaultEncoding = options.defaultEncoding || "utf8"; // not an actual buffer we keep track of, but a measurement
                // of how much we're waiting to get pushed to some underlying
                // socket or file.

                this.length = 0; // a flag to see when we're in the middle of a write.

                this.writing = false; // when true all writes will be buffered until .uncork() call

                this.corked = 0; // a flag to be able to tell if the onwrite cb is called immediately,
                // or on a later tick.  We set this to true at first, because any
                // actions that shouldn't happen until "later" should generally also
                // not happen before the first write call.

                this.sync = true; // a flag to know if we're processing previously buffered items, which
                // may call the _write() callback in the same tick, so that we don't
                // end up in an overlapped onwrite situation.

                this.bufferProcessing = false; // the callback that's passed to _write(chunk,cb)

                this.onwrite = function (er) {
                  onwrite(stream, er);
                }; // the callback that the user supplies to write(chunk,encoding,cb)

                this.writecb = null; // the amount that is being written when _write is called.

                this.writelen = 0;
                this.bufferedRequest = null;
                this.lastBufferedRequest = null; // number of pending user-supplied write callbacks
                // this must be 0 before 'finish' can be emitted

                this.pendingcb = 0; // emit prefinish if the only thing we're waiting for is _write cbs
                // This is relevant for synchronous Transform streams

                this.prefinished = false; // True if the error was already emitted and should not be thrown again

                this.errorEmitted = false; // Should close be emitted on destroy. Defaults to true.

                this.emitClose = options.emitClose !== false; // Should .destroy() be called after 'finish' (and potentially 'end')

                this.autoDestroy = !!options.autoDestroy; // count buffered requests

                this.bufferedRequestCount = 0; // allocate the first CorkedRequest, there is always
                // one allocated and free to use, and we maintain at most two

                this.corkedRequestsFree = new CorkedRequest(this);
              }

              WritableState.prototype.getBuffer = function getBuffer() {
                var current = this.bufferedRequest;
                var out = [];

                while (current) {
                  out.push(current);
                  current = current.next;
                }

                return out;
              };

              (function () {
                try {
                  Object.defineProperty(WritableState.prototype, "buffer", {
                    get: internalUtil.deprecate(
                      function writableStateBufferGetter() {
                        return this.getBuffer();
                      },
                      "_writableState.buffer is deprecated. Use _writableState.getBuffer " +
                        "instead.",
                      "DEP0003"
                    ),
                  });
                } catch (_) {}
              })(); // Test _writableState for inheritance to account for Duplex streams,
              // whose prototype chain only points to Readable.

              var realHasInstance;

              if (
                typeof Symbol === "function" &&
                Symbol.hasInstance &&
                typeof Function.prototype[Symbol.hasInstance] === "function"
              ) {
                realHasInstance = Function.prototype[Symbol.hasInstance];
                Object.defineProperty(Writable, Symbol.hasInstance, {
                  value: function value(object) {
                    if (realHasInstance.call(this, object)) return true;
                    if (this !== Writable) return false;
                    return (
                      object && object._writableState instanceof WritableState
                    );
                  },
                });
              } else {
                realHasInstance = function realHasInstance(object) {
                  return object instanceof this;
                };
              }

              function Writable(options) {
                Duplex = Duplex || require("./_stream_duplex"); // Writable ctor is applied to Duplexes, too.
                // `realHasInstance` is necessary because using plain `instanceof`
                // would return false, as no `_writableState` property is attached.
                // Trying to use the custom `instanceof` for Writable here will also break the
                // Node.js LazyTransform implementation, which has a non-trivial getter for
                // `_writableState` that would lead to infinite recursion.
                // Checking for a Stream.Duplex instance is faster here instead of inside
                // the WritableState constructor, at least with V8 6.5

                var isDuplex = this instanceof Duplex;
                if (!isDuplex && !realHasInstance.call(Writable, this))
                  return new Writable(options);
                this._writableState = new WritableState(
                  options,
                  this,
                  isDuplex
                ); // legacy.

                this.writable = true;

                if (options) {
                  if (typeof options.write === "function")
                    this._write = options.write;
                  if (typeof options.writev === "function")
                    this._writev = options.writev;
                  if (typeof options.destroy === "function")
                    this._destroy = options.destroy;
                  if (typeof options.final === "function")
                    this._final = options.final;
                }

                Stream.call(this);
              } // Otherwise people can pipe Writable streams, which is just wrong.

              Writable.prototype.pipe = function () {
                errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
              };

              function writeAfterEnd(stream, cb) {
                var er = new ERR_STREAM_WRITE_AFTER_END(); // TODO: defer error events consistently everywhere, not just the cb

                errorOrDestroy(stream, er);
                process.nextTick(cb, er);
              } // Checks that a user-supplied chunk is valid, especially for the particular
              // mode the stream is in. Currently this means that `null` is never accepted
              // and undefined/non-string values are only allowed in object mode.

              function validChunk(stream, state, chunk, cb) {
                var er;

                if (chunk === null) {
                  er = new ERR_STREAM_NULL_VALUES();
                } else if (typeof chunk !== "string" && !state.objectMode) {
                  er = new ERR_INVALID_ARG_TYPE(
                    "chunk",
                    ["string", "Buffer"],
                    chunk
                  );
                }

                if (er) {
                  errorOrDestroy(stream, er);
                  process.nextTick(cb, er);
                  return false;
                }

                return true;
              }

              Writable.prototype.write = function (chunk, encoding, cb) {
                var state = this._writableState;
                var ret = false;

                var isBuf = !state.objectMode && _isUint8Array(chunk);

                if (isBuf && !Buffer.isBuffer(chunk)) {
                  chunk = _uint8ArrayToBuffer(chunk);
                }

                if (typeof encoding === "function") {
                  cb = encoding;
                  encoding = null;
                }

                if (isBuf) encoding = "buffer";
                else if (!encoding) encoding = state.defaultEncoding;
                if (typeof cb !== "function") cb = nop;
                if (state.ending) writeAfterEnd(this, cb);
                else if (isBuf || validChunk(this, state, chunk, cb)) {
                  state.pendingcb++;
                  ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
                }
                return ret;
              };

              Writable.prototype.cork = function () {
                this._writableState.corked++;
              };

              Writable.prototype.uncork = function () {
                var state = this._writableState;

                if (state.corked) {
                  state.corked--;
                  if (
                    !state.writing &&
                    !state.corked &&
                    !state.bufferProcessing &&
                    state.bufferedRequest
                  )
                    clearBuffer(this, state);
                }
              };

              Writable.prototype.setDefaultEncoding =
                function setDefaultEncoding(encoding) {
                  // node::ParseEncoding() requires lower case.
                  if (typeof encoding === "string")
                    encoding = encoding.toLowerCase();
                  if (
                    !(
                      [
                        "hex",
                        "utf8",
                        "utf-8",
                        "ascii",
                        "binary",
                        "base64",
                        "ucs2",
                        "ucs-2",
                        "utf16le",
                        "utf-16le",
                        "raw",
                      ].indexOf((encoding + "").toLowerCase()) > -1
                    )
                  )
                    throw new ERR_UNKNOWN_ENCODING(encoding);
                  this._writableState.defaultEncoding = encoding;
                  return this;
                };

              Object.defineProperty(Writable.prototype, "writableBuffer", {
                // making it explicit this property is not enumerable
                // because otherwise some prototype manipulation in
                // userland will fail
                enumerable: false,
                get: function get() {
                  return this._writableState && this._writableState.getBuffer();
                },
              });

              function decodeChunk(state, chunk, encoding) {
                if (
                  !state.objectMode &&
                  state.decodeStrings !== false &&
                  typeof chunk === "string"
                ) {
                  chunk = Buffer.from(chunk, encoding);
                }

                return chunk;
              }

              Object.defineProperty(
                Writable.prototype,
                "writableHighWaterMark",
                {
                  // making it explicit this property is not enumerable
                  // because otherwise some prototype manipulation in
                  // userland will fail
                  enumerable: false,
                  get: function get() {
                    return this._writableState.highWaterMark;
                  },
                }
              ); // if we're already writing something, then just put this
              // in the queue, and wait our turn.  Otherwise, call _write
              // If we return false, then we need a drain event, so set that flag.

              function writeOrBuffer(
                stream,
                state,
                isBuf,
                chunk,
                encoding,
                cb
              ) {
                if (!isBuf) {
                  var newChunk = decodeChunk(state, chunk, encoding);

                  if (chunk !== newChunk) {
                    isBuf = true;
                    encoding = "buffer";
                    chunk = newChunk;
                  }
                }

                var len = state.objectMode ? 1 : chunk.length;
                state.length += len;
                var ret = state.length < state.highWaterMark; // we must ensure that previous needDrain will not be reset to false.

                if (!ret) state.needDrain = true;

                if (state.writing || state.corked) {
                  var last = state.lastBufferedRequest;
                  state.lastBufferedRequest = {
                    chunk: chunk,
                    encoding: encoding,
                    isBuf: isBuf,
                    callback: cb,
                    next: null,
                  };

                  if (last) {
                    last.next = state.lastBufferedRequest;
                  } else {
                    state.bufferedRequest = state.lastBufferedRequest;
                  }

                  state.bufferedRequestCount += 1;
                } else {
                  doWrite(stream, state, false, len, chunk, encoding, cb);
                }

                return ret;
              }

              function doWrite(
                stream,
                state,
                writev,
                len,
                chunk,
                encoding,
                cb
              ) {
                state.writelen = len;
                state.writecb = cb;
                state.writing = true;
                state.sync = true;
                if (state.destroyed)
                  state.onwrite(new ERR_STREAM_DESTROYED("write"));
                else if (writev) stream._writev(chunk, state.onwrite);
                else stream._write(chunk, encoding, state.onwrite);
                state.sync = false;
              }

              function onwriteError(stream, state, sync, er, cb) {
                --state.pendingcb;

                if (sync) {
                  // defer the callback if we are being called synchronously
                  // to avoid piling up things on the stack
                  process.nextTick(cb, er); // this can emit finish, and it will always happen
                  // after error

                  process.nextTick(finishMaybe, stream, state);
                  stream._writableState.errorEmitted = true;
                  errorOrDestroy(stream, er);
                } else {
                  // the caller expect this to happen before if
                  // it is async
                  cb(er);
                  stream._writableState.errorEmitted = true;
                  errorOrDestroy(stream, er); // this can emit finish, but finish must
                  // always follow error

                  finishMaybe(stream, state);
                }
              }

              function onwriteStateUpdate(state) {
                state.writing = false;
                state.writecb = null;
                state.length -= state.writelen;
                state.writelen = 0;
              }

              function onwrite(stream, er) {
                var state = stream._writableState;
                var sync = state.sync;
                var cb = state.writecb;
                if (typeof cb !== "function") throw new ERR_MULTIPLE_CALLBACK();
                onwriteStateUpdate(state);
                if (er) onwriteError(stream, state, sync, er, cb);
                else {
                  // Check if we're actually ready to finish, but don't emit yet
                  var finished = needFinish(state) || stream.destroyed;

                  if (
                    !finished &&
                    !state.corked &&
                    !state.bufferProcessing &&
                    state.bufferedRequest
                  ) {
                    clearBuffer(stream, state);
                  }

                  if (sync) {
                    process.nextTick(afterWrite, stream, state, finished, cb);
                  } else {
                    afterWrite(stream, state, finished, cb);
                  }
                }
              }

              function afterWrite(stream, state, finished, cb) {
                if (!finished) onwriteDrain(stream, state);
                state.pendingcb--;
                cb();
                finishMaybe(stream, state);
              } // Must force callback to be called on nextTick, so that we don't
              // emit 'drain' before the write() consumer gets the 'false' return
              // value, and has a chance to attach a 'drain' listener.

              function onwriteDrain(stream, state) {
                if (state.length === 0 && state.needDrain) {
                  state.needDrain = false;
                  stream.emit("drain");
                }
              } // if there's something in the buffer waiting, then process it

              function clearBuffer(stream, state) {
                state.bufferProcessing = true;
                var entry = state.bufferedRequest;

                if (stream._writev && entry && entry.next) {
                  // Fast case, write everything using _writev()
                  var l = state.bufferedRequestCount;
                  var buffer = new Array(l);
                  var holder = state.corkedRequestsFree;
                  holder.entry = entry;
                  var count = 0;
                  var allBuffers = true;

                  while (entry) {
                    buffer[count] = entry;
                    if (!entry.isBuf) allBuffers = false;
                    entry = entry.next;
                    count += 1;
                  }

                  buffer.allBuffers = allBuffers;
                  doWrite(
                    stream,
                    state,
                    true,
                    state.length,
                    buffer,
                    "",
                    holder.finish
                  ); // doWrite is almost always async, defer these to save a bit of time
                  // as the hot path ends with doWrite

                  state.pendingcb++;
                  state.lastBufferedRequest = null;

                  if (holder.next) {
                    state.corkedRequestsFree = holder.next;
                    holder.next = null;
                  } else {
                    state.corkedRequestsFree = new CorkedRequest(state);
                  }

                  state.bufferedRequestCount = 0;
                } else {
                  // Slow case, write chunks one-by-one
                  while (entry) {
                    var chunk = entry.chunk;
                    var encoding = entry.encoding;
                    var cb = entry.callback;
                    var len = state.objectMode ? 1 : chunk.length;
                    doWrite(stream, state, false, len, chunk, encoding, cb);
                    entry = entry.next;
                    state.bufferedRequestCount--; // if we didn't call the onwrite immediately, then
                    // it means that we need to wait until it does.
                    // also, that means that the chunk and cb are currently
                    // being processed, so move the buffer counter past them.

                    if (state.writing) {
                      break;
                    }
                  }

                  if (entry === null) state.lastBufferedRequest = null;
                }

                state.bufferedRequest = entry;
                state.bufferProcessing = false;
              }

              Writable.prototype._write = function (chunk, encoding, cb) {
                cb(new ERR_METHOD_NOT_IMPLEMENTED("_write()"));
              };

              Writable.prototype._writev = null;

              Writable.prototype.end = function (chunk, encoding, cb) {
                var state = this._writableState;

                if (typeof chunk === "function") {
                  cb = chunk;
                  chunk = null;
                  encoding = null;
                } else if (typeof encoding === "function") {
                  cb = encoding;
                  encoding = null;
                }

                if (chunk !== null && chunk !== undefined)
                  this.write(chunk, encoding); // .end() fully uncorks

                if (state.corked) {
                  state.corked = 1;
                  this.uncork();
                } // ignore unnecessary end() calls.

                if (!state.ending) endWritable(this, state, cb);
                return this;
              };

              Object.defineProperty(Writable.prototype, "writableLength", {
                // making it explicit this property is not enumerable
                // because otherwise some prototype manipulation in
                // userland will fail
                enumerable: false,
                get: function get() {
                  return this._writableState.length;
                },
              });

              function needFinish(state) {
                return (
                  state.ending &&
                  state.length === 0 &&
                  state.bufferedRequest === null &&
                  !state.finished &&
                  !state.writing
                );
              }

              function callFinal(stream, state) {
                stream._final(function (err) {
                  state.pendingcb--;

                  if (err) {
                    errorOrDestroy(stream, err);
                  }

                  state.prefinished = true;
                  stream.emit("prefinish");
                  finishMaybe(stream, state);
                });
              }

              function prefinish(stream, state) {
                if (!state.prefinished && !state.finalCalled) {
                  if (typeof stream._final === "function" && !state.destroyed) {
                    state.pendingcb++;
                    state.finalCalled = true;
                    process.nextTick(callFinal, stream, state);
                  } else {
                    state.prefinished = true;
                    stream.emit("prefinish");
                  }
                }
              }

              function finishMaybe(stream, state) {
                var need = needFinish(state);

                if (need) {
                  prefinish(stream, state);

                  if (state.pendingcb === 0) {
                    state.finished = true;
                    stream.emit("finish");

                    if (state.autoDestroy) {
                      // In case of duplex streams we need a way to detect
                      // if the readable side is ready for autoDestroy as well
                      var rState = stream._readableState;

                      if (
                        !rState ||
                        (rState.autoDestroy && rState.endEmitted)
                      ) {
                        stream.destroy();
                      }
                    }
                  }
                }

                return need;
              }

              function endWritable(stream, state, cb) {
                state.ending = true;
                finishMaybe(stream, state);

                if (cb) {
                  if (state.finished) process.nextTick(cb);
                  else stream.once("finish", cb);
                }

                state.ended = true;
                stream.writable = false;
              }

              function onCorkedFinish(corkReq, state, err) {
                var entry = corkReq.entry;
                corkReq.entry = null;

                while (entry) {
                  var cb = entry.callback;
                  state.pendingcb--;
                  cb(err);
                  entry = entry.next;
                } // reuse the free corkReq.

                state.corkedRequestsFree.next = corkReq;
              }

              Object.defineProperty(Writable.prototype, "destroyed", {
                // making it explicit this property is not enumerable
                // because otherwise some prototype manipulation in
                // userland will fail
                enumerable: false,
                get: function get() {
                  if (this._writableState === undefined) {
                    return false;
                  }

                  return this._writableState.destroyed;
                },
                set: function set(value) {
                  // we ignore the value if the stream
                  // has not been initialized yet
                  if (!this._writableState) {
                    return;
                  } // backward compatibility, the user is explicitly
                  // managing destroyed

                  this._writableState.destroyed = value;
                },
              });
              Writable.prototype.destroy = destroyImpl.destroy;
              Writable.prototype._undestroy = destroyImpl.undestroy;

              Writable.prototype._destroy = function (err, cb) {
                cb(err);
              };
            }.call(this));
          }.call(
            this,
            require("_process"),
            typeof global !== "undefined"
              ? global
              : typeof self !== "undefined"
              ? self
              : typeof window !== "undefined"
              ? window
              : {}
          ));
        },
        {
          "../errors": 35,
          "./_stream_duplex": 36,
          "./internal/streams/destroy": 43,
          "./internal/streams/state": 47,
          "./internal/streams/stream": 48,
          _process: 30,
          buffer: 7,
          inherits: 14,
          "util-deprecate": 60,
        },
      ],
      41: [
        function (require, module, exports) {
          (function (process) {
            (function () {
              "use strict";

              var _Object$setPrototypeO;

              function _defineProperty(obj, key, value) {
                if (key in obj) {
                  Object.defineProperty(obj, key, {
                    value: value,
                    enumerable: true,
                    configurable: true,
                    writable: true,
                  });
                } else {
                  obj[key] = value;
                }
                return obj;
              }

              var finished = require("./end-of-stream");

              var kLastResolve = Symbol("lastResolve");
              var kLastReject = Symbol("lastReject");
              var kError = Symbol("error");
              var kEnded = Symbol("ended");
              var kLastPromise = Symbol("lastPromise");
              var kHandlePromise = Symbol("handlePromise");
              var kStream = Symbol("stream");

              function createIterResult(value, done) {
                return {
                  value: value,
                  done: done,
                };
              }

              function readAndResolve(iter) {
                var resolve = iter[kLastResolve];

                if (resolve !== null) {
                  var data = iter[kStream].read(); // we defer if data is null
                  // we can be expecting either 'end' or
                  // 'error'

                  if (data !== null) {
                    iter[kLastPromise] = null;
                    iter[kLastResolve] = null;
                    iter[kLastReject] = null;
                    resolve(createIterResult(data, false));
                  }
                }
              }

              function onReadable(iter) {
                // we wait for the next tick, because it might
                // emit an error with process.nextTick
                process.nextTick(readAndResolve, iter);
              }

              function wrapForNext(lastPromise, iter) {
                return function (resolve, reject) {
                  lastPromise.then(function () {
                    if (iter[kEnded]) {
                      resolve(createIterResult(undefined, true));
                      return;
                    }

                    iter[kHandlePromise](resolve, reject);
                  }, reject);
                };
              }

              var AsyncIteratorPrototype = Object.getPrototypeOf(
                function () {}
              );
              var ReadableStreamAsyncIteratorPrototype = Object.setPrototypeOf(
                ((_Object$setPrototypeO = {
                  get stream() {
                    return this[kStream];
                  },

                  next: function next() {
                    var _this = this;

                    // if we have detected an error in the meanwhile
                    // reject straight away
                    var error = this[kError];

                    if (error !== null) {
                      return Promise.reject(error);
                    }

                    if (this[kEnded]) {
                      return Promise.resolve(createIterResult(undefined, true));
                    }

                    if (this[kStream].destroyed) {
                      // We need to defer via nextTick because if .destroy(err) is
                      // called, the error will be emitted via nextTick, and
                      // we cannot guarantee that there is no error lingering around
                      // waiting to be emitted.
                      return new Promise(function (resolve, reject) {
                        process.nextTick(function () {
                          if (_this[kError]) {
                            reject(_this[kError]);
                          } else {
                            resolve(createIterResult(undefined, true));
                          }
                        });
                      });
                    } // if we have multiple next() calls
                    // we will wait for the previous Promise to finish
                    // this logic is optimized to support for await loops,
                    // where next() is only called once at a time

                    var lastPromise = this[kLastPromise];
                    var promise;

                    if (lastPromise) {
                      promise = new Promise(wrapForNext(lastPromise, this));
                    } else {
                      // fast path needed to support multiple this.push()
                      // without triggering the next() queue
                      var data = this[kStream].read();

                      if (data !== null) {
                        return Promise.resolve(createIterResult(data, false));
                      }

                      promise = new Promise(this[kHandlePromise]);
                    }

                    this[kLastPromise] = promise;
                    return promise;
                  },
                }),
                _defineProperty(
                  _Object$setPrototypeO,
                  Symbol.asyncIterator,
                  function () {
                    return this;
                  }
                ),
                _defineProperty(
                  _Object$setPrototypeO,
                  "return",
                  function _return() {
                    var _this2 = this;

                    // destroy(err, cb) is a private API
                    // we can guarantee we have that here, because we control the
                    // Readable class this is attached to
                    return new Promise(function (resolve, reject) {
                      _this2[kStream].destroy(null, function (err) {
                        if (err) {
                          reject(err);
                          return;
                        }

                        resolve(createIterResult(undefined, true));
                      });
                    });
                  }
                ),
                _Object$setPrototypeO),
                AsyncIteratorPrototype
              );

              var createReadableStreamAsyncIterator =
                function createReadableStreamAsyncIterator(stream) {
                  var _Object$create;

                  var iterator = Object.create(
                    ReadableStreamAsyncIteratorPrototype,
                    ((_Object$create = {}),
                    _defineProperty(_Object$create, kStream, {
                      value: stream,
                      writable: true,
                    }),
                    _defineProperty(_Object$create, kLastResolve, {
                      value: null,
                      writable: true,
                    }),
                    _defineProperty(_Object$create, kLastReject, {
                      value: null,
                      writable: true,
                    }),
                    _defineProperty(_Object$create, kError, {
                      value: null,
                      writable: true,
                    }),
                    _defineProperty(_Object$create, kEnded, {
                      value: stream._readableState.endEmitted,
                      writable: true,
                    }),
                    _defineProperty(_Object$create, kHandlePromise, {
                      value: function value(resolve, reject) {
                        var data = iterator[kStream].read();

                        if (data) {
                          iterator[kLastPromise] = null;
                          iterator[kLastResolve] = null;
                          iterator[kLastReject] = null;
                          resolve(createIterResult(data, false));
                        } else {
                          iterator[kLastResolve] = resolve;
                          iterator[kLastReject] = reject;
                        }
                      },
                      writable: true,
                    }),
                    _Object$create)
                  );
                  iterator[kLastPromise] = null;
                  finished(stream, function (err) {
                    if (err && err.code !== "ERR_STREAM_PREMATURE_CLOSE") {
                      var reject = iterator[kLastReject]; // reject if we are waiting for data in the Promise
                      // returned by next() and store the error

                      if (reject !== null) {
                        iterator[kLastPromise] = null;
                        iterator[kLastResolve] = null;
                        iterator[kLastReject] = null;
                        reject(err);
                      }

                      iterator[kError] = err;
                      return;
                    }

                    var resolve = iterator[kLastResolve];

                    if (resolve !== null) {
                      iterator[kLastPromise] = null;
                      iterator[kLastResolve] = null;
                      iterator[kLastReject] = null;
                      resolve(createIterResult(undefined, true));
                    }

                    iterator[kEnded] = true;
                  });
                  stream.on("readable", onReadable.bind(null, iterator));
                  return iterator;
                };

              module.exports = createReadableStreamAsyncIterator;
            }.call(this));
          }.call(this, require("_process")));
        },
        { "./end-of-stream": 44, _process: 30 },
      ],
      42: [
        function (require, module, exports) {
          "use strict";

          function ownKeys(object, enumerableOnly) {
            var keys = Object.keys(object);
            if (Object.getOwnPropertySymbols) {
              var symbols = Object.getOwnPropertySymbols(object);
              if (enumerableOnly)
                symbols = symbols.filter(function (sym) {
                  return Object.getOwnPropertyDescriptor(
                    object,
                    sym
                  ).enumerable;
                });
              keys.push.apply(keys, symbols);
            }
            return keys;
          }

          function _objectSpread(target) {
            for (var i = 1; i < arguments.length; i++) {
              var source = arguments[i] != null ? arguments[i] : {};
              if (i % 2) {
                ownKeys(Object(source), true).forEach(function (key) {
                  _defineProperty(target, key, source[key]);
                });
              } else if (Object.getOwnPropertyDescriptors) {
                Object.defineProperties(
                  target,
                  Object.getOwnPropertyDescriptors(source)
                );
              } else {
                ownKeys(Object(source)).forEach(function (key) {
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

          function _defineProperty(obj, key, value) {
            if (key in obj) {
              Object.defineProperty(obj, key, {
                value: value,
                enumerable: true,
                configurable: true,
                writable: true,
              });
            } else {
              obj[key] = value;
            }
            return obj;
          }

          function _classCallCheck(instance, Constructor) {
            if (!(instance instanceof Constructor)) {
              throw new TypeError("Cannot call a class as a function");
            }
          }

          function _defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
              var descriptor = props[i];
              descriptor.enumerable = descriptor.enumerable || false;
              descriptor.configurable = true;
              if ("value" in descriptor) descriptor.writable = true;
              Object.defineProperty(target, descriptor.key, descriptor);
            }
          }

          function _createClass(Constructor, protoProps, staticProps) {
            if (protoProps)
              _defineProperties(Constructor.prototype, protoProps);
            if (staticProps) _defineProperties(Constructor, staticProps);
            return Constructor;
          }

          var _require = require("buffer"),
            Buffer = _require.Buffer;

          var _require2 = require("util"),
            inspect = _require2.inspect;

          var custom = (inspect && inspect.custom) || "inspect";

          function copyBuffer(src, target, offset) {
            Buffer.prototype.copy.call(src, target, offset);
          }

          module.exports =
            /*#__PURE__*/
            (function () {
              function BufferList() {
                _classCallCheck(this, BufferList);

                this.head = null;
                this.tail = null;
                this.length = 0;
              }

              _createClass(BufferList, [
                {
                  key: "push",
                  value: function push(v) {
                    var entry = {
                      data: v,
                      next: null,
                    };
                    if (this.length > 0) this.tail.next = entry;
                    else this.head = entry;
                    this.tail = entry;
                    ++this.length;
                  },
                },
                {
                  key: "unshift",
                  value: function unshift(v) {
                    var entry = {
                      data: v,
                      next: this.head,
                    };
                    if (this.length === 0) this.tail = entry;
                    this.head = entry;
                    ++this.length;
                  },
                },
                {
                  key: "shift",
                  value: function shift() {
                    if (this.length === 0) return;
                    var ret = this.head.data;
                    if (this.length === 1) this.head = this.tail = null;
                    else this.head = this.head.next;
                    --this.length;
                    return ret;
                  },
                },
                {
                  key: "clear",
                  value: function clear() {
                    this.head = this.tail = null;
                    this.length = 0;
                  },
                },
                {
                  key: "join",
                  value: function join(s) {
                    if (this.length === 0) return "";
                    var p = this.head;
                    var ret = "" + p.data;

                    while ((p = p.next)) {
                      ret += s + p.data;
                    }

                    return ret;
                  },
                },
                {
                  key: "concat",
                  value: function concat(n) {
                    if (this.length === 0) return Buffer.alloc(0);
                    var ret = Buffer.allocUnsafe(n >>> 0);
                    var p = this.head;
                    var i = 0;

                    while (p) {
                      copyBuffer(p.data, ret, i);
                      i += p.data.length;
                      p = p.next;
                    }

                    return ret;
                  }, // Consumes a specified amount of bytes or characters from the buffered data.
                },
                {
                  key: "consume",
                  value: function consume(n, hasStrings) {
                    var ret;

                    if (n < this.head.data.length) {
                      // `slice` is the same for buffers and strings.
                      ret = this.head.data.slice(0, n);
                      this.head.data = this.head.data.slice(n);
                    } else if (n === this.head.data.length) {
                      // First chunk is a perfect match.
                      ret = this.shift();
                    } else {
                      // Result spans more than one buffer.
                      ret = hasStrings
                        ? this._getString(n)
                        : this._getBuffer(n);
                    }

                    return ret;
                  },
                },
                {
                  key: "first",
                  value: function first() {
                    return this.head.data;
                  }, // Consumes a specified amount of characters from the buffered data.
                },
                {
                  key: "_getString",
                  value: function _getString(n) {
                    var p = this.head;
                    var c = 1;
                    var ret = p.data;
                    n -= ret.length;

                    while ((p = p.next)) {
                      var str = p.data;
                      var nb = n > str.length ? str.length : n;
                      if (nb === str.length) ret += str;
                      else ret += str.slice(0, n);
                      n -= nb;

                      if (n === 0) {
                        if (nb === str.length) {
                          ++c;
                          if (p.next) this.head = p.next;
                          else this.head = this.tail = null;
                        } else {
                          this.head = p;
                          p.data = str.slice(nb);
                        }

                        break;
                      }

                      ++c;
                    }

                    this.length -= c;
                    return ret;
                  }, // Consumes a specified amount of bytes from the buffered data.
                },
                {
                  key: "_getBuffer",
                  value: function _getBuffer(n) {
                    var ret = Buffer.allocUnsafe(n);
                    var p = this.head;
                    var c = 1;
                    p.data.copy(ret);
                    n -= p.data.length;

                    while ((p = p.next)) {
                      var buf = p.data;
                      var nb = n > buf.length ? buf.length : n;
                      buf.copy(ret, ret.length - n, 0, nb);
                      n -= nb;

                      if (n === 0) {
                        if (nb === buf.length) {
                          ++c;
                          if (p.next) this.head = p.next;
                          else this.head = this.tail = null;
                        } else {
                          this.head = p;
                          p.data = buf.slice(nb);
                        }

                        break;
                      }

                      ++c;
                    }

                    this.length -= c;
                    return ret;
                  }, // Make sure the linked list only shows the minimal necessary information.
                },
                {
                  key: custom,
                  value: function value(_, options) {
                    return inspect(
                      this,
                      _objectSpread({}, options, {
                        // Only inspect one level.
                        depth: 0,
                        // It should not recurse.
                        customInspect: false,
                      })
                    );
                  },
                },
              ]);

              return BufferList;
            })();
        },
        { buffer: 7, util: 3 },
      ],
      43: [
        function (require, module, exports) {
          (function (process) {
            (function () {
              "use strict"; // undocumented cb() API, needed for core, not for public API

              function destroy(err, cb) {
                var _this = this;

                var readableDestroyed =
                  this._readableState && this._readableState.destroyed;
                var writableDestroyed =
                  this._writableState && this._writableState.destroyed;

                if (readableDestroyed || writableDestroyed) {
                  if (cb) {
                    cb(err);
                  } else if (err) {
                    if (!this._writableState) {
                      process.nextTick(emitErrorNT, this, err);
                    } else if (!this._writableState.errorEmitted) {
                      this._writableState.errorEmitted = true;
                      process.nextTick(emitErrorNT, this, err);
                    }
                  }

                  return this;
                } // we set destroyed to true before firing error callbacks in order
                // to make it re-entrance safe in case destroy() is called within callbacks

                if (this._readableState) {
                  this._readableState.destroyed = true;
                } // if this is a duplex stream mark the writable part as destroyed as well

                if (this._writableState) {
                  this._writableState.destroyed = true;
                }

                this._destroy(err || null, function (err) {
                  if (!cb && err) {
                    if (!_this._writableState) {
                      process.nextTick(emitErrorAndCloseNT, _this, err);
                    } else if (!_this._writableState.errorEmitted) {
                      _this._writableState.errorEmitted = true;
                      process.nextTick(emitErrorAndCloseNT, _this, err);
                    } else {
                      process.nextTick(emitCloseNT, _this);
                    }
                  } else if (cb) {
                    process.nextTick(emitCloseNT, _this);
                    cb(err);
                  } else {
                    process.nextTick(emitCloseNT, _this);
                  }
                });

                return this;
              }

              function emitErrorAndCloseNT(self, err) {
                emitErrorNT(self, err);
                emitCloseNT(self);
              }

              function emitCloseNT(self) {
                if (self._writableState && !self._writableState.emitClose)
                  return;
                if (self._readableState && !self._readableState.emitClose)
                  return;
                self.emit("close");
              }

              function undestroy() {
                if (this._readableState) {
                  this._readableState.destroyed = false;
                  this._readableState.reading = false;
                  this._readableState.ended = false;
                  this._readableState.endEmitted = false;
                }

                if (this._writableState) {
                  this._writableState.destroyed = false;
                  this._writableState.ended = false;
                  this._writableState.ending = false;
                  this._writableState.finalCalled = false;
                  this._writableState.prefinished = false;
                  this._writableState.finished = false;
                  this._writableState.errorEmitted = false;
                }
              }

              function emitErrorNT(self, err) {
                self.emit("error", err);
              }

              function errorOrDestroy(stream, err) {
                // We have tests that rely on errors being emitted
                // in the same tick, so changing this is semver major.
                // For now when you opt-in to autoDestroy we allow
                // the error to be emitted nextTick. In a future
                // semver major update we should change the default to this.
                var rState = stream._readableState;
                var wState = stream._writableState;
                if (
                  (rState && rState.autoDestroy) ||
                  (wState && wState.autoDestroy)
                )
                  stream.destroy(err);
                else stream.emit("error", err);
              }

              module.exports = {
                destroy: destroy,
                undestroy: undestroy,
                errorOrDestroy: errorOrDestroy,
              };
            }.call(this));
          }.call(this, require("_process")));
        },
        { _process: 30 },
      ],
      44: [
        function (require, module, exports) {
          // Ported from https://github.com/mafintosh/end-of-stream with
          // permission from the author, Mathias Buus (@mafintosh).
          "use strict";

          var ERR_STREAM_PREMATURE_CLOSE =
            require("../../../errors").codes.ERR_STREAM_PREMATURE_CLOSE;

          function once(callback) {
            var called = false;
            return function () {
              if (called) return;
              called = true;

              for (
                var _len = arguments.length, args = new Array(_len), _key = 0;
                _key < _len;
                _key++
              ) {
                args[_key] = arguments[_key];
              }

              callback.apply(this, args);
            };
          }

          function noop() {}

          function isRequest(stream) {
            return stream.setHeader && typeof stream.abort === "function";
          }

          function eos(stream, opts, callback) {
            if (typeof opts === "function") return eos(stream, null, opts);
            if (!opts) opts = {};
            callback = once(callback || noop);
            var readable =
              opts.readable || (opts.readable !== false && stream.readable);
            var writable =
              opts.writable || (opts.writable !== false && stream.writable);

            var onlegacyfinish = function onlegacyfinish() {
              if (!stream.writable) onfinish();
            };

            var writableEnded =
              stream._writableState && stream._writableState.finished;

            var onfinish = function onfinish() {
              writable = false;
              writableEnded = true;
              if (!readable) callback.call(stream);
            };

            var readableEnded =
              stream._readableState && stream._readableState.endEmitted;

            var onend = function onend() {
              readable = false;
              readableEnded = true;
              if (!writable) callback.call(stream);
            };

            var onerror = function onerror(err) {
              callback.call(stream, err);
            };

            var onclose = function onclose() {
              var err;

              if (readable && !readableEnded) {
                if (!stream._readableState || !stream._readableState.ended)
                  err = new ERR_STREAM_PREMATURE_CLOSE();
                return callback.call(stream, err);
              }

              if (writable && !writableEnded) {
                if (!stream._writableState || !stream._writableState.ended)
                  err = new ERR_STREAM_PREMATURE_CLOSE();
                return callback.call(stream, err);
              }
            };

            var onrequest = function onrequest() {
              stream.req.on("finish", onfinish);
            };

            if (isRequest(stream)) {
              stream.on("complete", onfinish);
              stream.on("abort", onclose);
              if (stream.req) onrequest();
              else stream.on("request", onrequest);
            } else if (writable && !stream._writableState) {
              // legacy streams
              stream.on("end", onlegacyfinish);
              stream.on("close", onlegacyfinish);
            }

            stream.on("end", onend);
            stream.on("finish", onfinish);
            if (opts.error !== false) stream.on("error", onerror);
            stream.on("close", onclose);
            return function () {
              stream.removeListener("complete", onfinish);
              stream.removeListener("abort", onclose);
              stream.removeListener("request", onrequest);
              if (stream.req) stream.req.removeListener("finish", onfinish);
              stream.removeListener("end", onlegacyfinish);
              stream.removeListener("close", onlegacyfinish);
              stream.removeListener("finish", onfinish);
              stream.removeListener("end", onend);
              stream.removeListener("error", onerror);
              stream.removeListener("close", onclose);
            };
          }

          module.exports = eos;
        },
        { "../../../errors": 35 },
      ],
      45: [
        function (require, module, exports) {
          module.exports = function () {
            throw new Error("Readable.from is not available in the browser");
          };
        },
        {},
      ],
      46: [
        function (require, module, exports) {
          // Ported from https://github.com/mafintosh/pump with
          // permission from the author, Mathias Buus (@mafintosh).
          "use strict";

          var eos;

          function once(callback) {
            var called = false;
            return function () {
              if (called) return;
              called = true;
              callback.apply(void 0, arguments);
            };
          }

          var _require$codes = require("../../../errors").codes,
            ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS,
            ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED;

          function noop(err) {
            // Rethrow the error if it exists to avoid swallowing it
            if (err) throw err;
          }

          function isRequest(stream) {
            return stream.setHeader && typeof stream.abort === "function";
          }

          function destroyer(stream, reading, writing, callback) {
            callback = once(callback);
            var closed = false;
            stream.on("close", function () {
              closed = true;
            });
            if (eos === undefined) eos = require("./end-of-stream");
            eos(
              stream,
              {
                readable: reading,
                writable: writing,
              },
              function (err) {
                if (err) return callback(err);
                closed = true;
                callback();
              }
            );
            var destroyed = false;
            return function (err) {
              if (closed) return;
              if (destroyed) return;
              destroyed = true; // request.destroy just do .end - .abort is what we want

              if (isRequest(stream)) return stream.abort();
              if (typeof stream.destroy === "function") return stream.destroy();
              callback(err || new ERR_STREAM_DESTROYED("pipe"));
            };
          }

          function call(fn) {
            fn();
          }

          function pipe(from, to) {
            return from.pipe(to);
          }

          function popCallback(streams) {
            if (!streams.length) return noop;
            if (typeof streams[streams.length - 1] !== "function") return noop;
            return streams.pop();
          }

          function pipeline() {
            for (
              var _len = arguments.length, streams = new Array(_len), _key = 0;
              _key < _len;
              _key++
            ) {
              streams[_key] = arguments[_key];
            }

            var callback = popCallback(streams);
            if (Array.isArray(streams[0])) streams = streams[0];

            if (streams.length < 2) {
              throw new ERR_MISSING_ARGS("streams");
            }

            var error;
            var destroys = streams.map(function (stream, i) {
              var reading = i < streams.length - 1;
              var writing = i > 0;
              return destroyer(stream, reading, writing, function (err) {
                if (!error) error = err;
                if (err) destroys.forEach(call);
                if (reading) return;
                destroys.forEach(call);
                callback(error);
              });
            });
            return streams.reduce(pipe);
          }

          module.exports = pipeline;
        },
        { "../../../errors": 35, "./end-of-stream": 44 },
      ],
      47: [
        function (require, module, exports) {
          "use strict";

          var ERR_INVALID_OPT_VALUE =
            require("../../../errors").codes.ERR_INVALID_OPT_VALUE;

          function highWaterMarkFrom(options, isDuplex, duplexKey) {
            return options.highWaterMark != null
              ? options.highWaterMark
              : isDuplex
              ? options[duplexKey]
              : null;
          }

          function getHighWaterMark(state, options, duplexKey, isDuplex) {
            var hwm = highWaterMarkFrom(options, isDuplex, duplexKey);

            if (hwm != null) {
              if (!(isFinite(hwm) && Math.floor(hwm) === hwm) || hwm < 0) {
                var name = isDuplex ? duplexKey : "highWaterMark";
                throw new ERR_INVALID_OPT_VALUE(name, hwm);
              }

              return Math.floor(hwm);
            } // Default value

            return state.objectMode ? 16 : 16 * 1024;
          }

          module.exports = {
            getHighWaterMark: getHighWaterMark,
          };
        },
        { "../../../errors": 35 },
      ],
      48: [
        function (require, module, exports) {
          module.exports = require("events").EventEmitter;
        },
        { events: 12 },
      ],
      49: [
        function (require, module, exports) {
          exports = module.exports = require("./lib/_stream_readable.js");
          exports.Stream = exports;
          exports.Readable = exports;
          exports.Writable = require("./lib/_stream_writable.js");
          exports.Duplex = require("./lib/_stream_duplex.js");
          exports.Transform = require("./lib/_stream_transform.js");
          exports.PassThrough = require("./lib/_stream_passthrough.js");
          exports.finished = require("./lib/internal/streams/end-of-stream.js");
          exports.pipeline = require("./lib/internal/streams/pipeline.js");
        },
        {
          "./lib/_stream_duplex.js": 36,
          "./lib/_stream_passthrough.js": 37,
          "./lib/_stream_readable.js": 38,
          "./lib/_stream_transform.js": 39,
          "./lib/_stream_writable.js": 40,
          "./lib/internal/streams/end-of-stream.js": 44,
          "./lib/internal/streams/pipeline.js": 46,
        },
      ],
      50: [
        function (require, module, exports) {
          /*! render-media. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
          exports.render = render;
          exports.append = append;
          exports.mime = require("./lib/mime.json");

          const debug = require("debug")("render-media");
          const isAscii = require("is-ascii");
          const MediaElementWrapper = require("mediasource");
          const path = require("path");
          const streamToBlobURL = require("stream-to-blob-url");
          const VideoStream = require("videostream");

          // Note: Everything listed in VIDEOSTREAM_EXTS should also appear in either
          // MEDIASOURCE_VIDEO_EXTS or MEDIASOURCE_AUDIO_EXTS.
          const VIDEOSTREAM_EXTS = [".m4a", ".m4b", ".m4p", ".m4v", ".mp4"];

          const MEDIASOURCE_VIDEO_EXTS = [".m4v", ".mkv", ".mp4", ".webm"];

          const MEDIASOURCE_AUDIO_EXTS = [".m4a", ".m4b", ".m4p", ".mp3"];

          const MEDIASOURCE_EXTS = [].concat(
            MEDIASOURCE_VIDEO_EXTS,
            MEDIASOURCE_AUDIO_EXTS
          );

          const VIDEO_EXTS = [".mov", ".ogv"];

          const AUDIO_EXTS = [".aac", ".oga", ".ogg", ".wav", ".flac"];

          const IMAGE_EXTS = [".bmp", ".gif", ".jpeg", ".jpg", ".png", ".svg"];

          const IFRAME_EXTS = [
            ".css",
            ".html",
            ".js",
            ".md",
            ".pdf",
            ".srt",
            ".txt",
          ];

          // Maximum file length for which the Blob URL strategy will be attempted
          // See: https://github.com/feross/render-media/issues/18
          const MAX_BLOB_LENGTH = 200 * 1000 * 1000; // 200 MB

          const MediaSource =
            typeof window !== "undefined" && window.MediaSource;

          function render(file, elem, opts, cb) {
            if (typeof opts === "function") {
              cb = opts;
              opts = {};
            }
            if (!opts) opts = {};
            if (!cb) cb = () => {};

            validateFile(file);
            parseOpts(opts);

            if (typeof elem === "string") elem = document.querySelector(elem);

            renderMedia(
              file,
              (tagName) => {
                if (elem.nodeName !== tagName.toUpperCase()) {
                  const extname = path.extname(file.name).toLowerCase();

                  throw new Error(
                    `Cannot render "${extname}" inside a "${elem.nodeName.toLowerCase()}" element, expected "${tagName}"`
                  );
                }

                if (tagName === "video" || tagName === "audio")
                  setMediaOpts(elem, opts);

                return elem;
              },
              opts,
              cb
            );
          }

          function append(file, rootElem, opts, cb) {
            if (typeof opts === "function") {
              cb = opts;
              opts = {};
            }
            if (!opts) opts = {};
            if (!cb) cb = () => {};

            validateFile(file);
            parseOpts(opts);

            if (typeof rootElem === "string")
              rootElem = document.querySelector(rootElem);

            if (
              rootElem &&
              (rootElem.nodeName === "VIDEO" || rootElem.nodeName === "AUDIO")
            ) {
              throw new Error(
                "Invalid video/audio node argument. Argument must be root element that " +
                  "video/audio tag will be appended to."
              );
            }

            renderMedia(file, getElem, opts, done);

            function getElem(tagName) {
              if (tagName === "video" || tagName === "audio")
                return createMedia(tagName);
              else return createElem(tagName);
            }

            function createMedia(tagName) {
              const elem = createElem(tagName);
              setMediaOpts(elem, opts);
              rootElem.appendChild(elem);
              return elem;
            }

            function createElem(tagName) {
              const elem = document.createElement(tagName);
              rootElem.appendChild(elem);
              return elem;
            }

            function done(err, elem) {
              if (err && elem) elem.remove();
              cb(err, elem);
            }
          }

          function renderMedia(file, getElem, opts, cb) {
            const extname = path.extname(file.name).toLowerCase();
            let currentTime = 0;
            let elem;

            if (MEDIASOURCE_EXTS.includes(extname)) {
              renderMediaSource();
            } else if (VIDEO_EXTS.includes(extname)) {
              renderMediaElement("video");
            } else if (AUDIO_EXTS.includes(extname)) {
              renderMediaElement("audio");
            } else if (IMAGE_EXTS.includes(extname)) {
              renderImage();
            } else if (IFRAME_EXTS.includes(extname)) {
              renderIframe();
            } else {
              tryRenderIframe();
            }

            function renderMediaSource() {
              const tagName = MEDIASOURCE_VIDEO_EXTS.includes(extname)
                ? "video"
                : "audio";

              if (MediaSource) {
                if (VIDEOSTREAM_EXTS.includes(extname)) {
                  useVideostream();
                } else {
                  useMediaSource();
                }
              } else {
                useBlobURL();
              }

              function useVideostream() {
                debug(`Use \`videostream\` package for ${file.name}`);
                prepareElem();
                elem.addEventListener("error", fallbackToMediaSource);
                elem.addEventListener("loadstart", onLoadStart);
                elem.addEventListener("loadedmetadata", onLoadedMetadata);
                new VideoStream(file, elem); /* eslint-disable-line no-new */
              }

              function useMediaSource() {
                debug(`Use MediaSource API for ${file.name}`);
                prepareElem();
                elem.addEventListener("error", fallbackToBlobURL);
                elem.addEventListener("loadstart", onLoadStart);
                elem.addEventListener("loadedmetadata", onLoadedMetadata);

                const wrapper = new MediaElementWrapper(elem);
                const writable = wrapper.createWriteStream(getCodec(file.name));
                file.createReadStream().pipe(writable);

                if (currentTime) elem.currentTime = currentTime;
              }

              function useBlobURL() {
                debug(`Use Blob URL for ${file.name}`);
                prepareElem();
                elem.addEventListener("error", fatalError);
                elem.addEventListener("loadstart", onLoadStart);
                elem.addEventListener("loadedmetadata", onLoadedMetadata);
                getBlobURL(file, (err, url) => {
                  if (err) return fatalError(err);
                  elem.src = url;
                  if (currentTime) elem.currentTime = currentTime;
                });
              }

              function fallbackToMediaSource(err) {
                debug(
                  "videostream error: fallback to MediaSource API: %o",
                  err.message || err
                );
                elem.removeEventListener("error", fallbackToMediaSource);
                elem.removeEventListener("loadedmetadata", onLoadedMetadata);

                useMediaSource();
              }

              function fallbackToBlobURL(err) {
                debug(
                  "MediaSource API error: fallback to Blob URL: %o",
                  err.message || err
                );
                if (!checkBlobLength()) return;

                elem.removeEventListener("error", fallbackToBlobURL);
                elem.removeEventListener("loadedmetadata", onLoadedMetadata);

                useBlobURL();
              }

              function prepareElem() {
                if (!elem) {
                  elem = getElem(tagName);

                  elem.addEventListener("progress", () => {
                    currentTime = elem.currentTime;
                  });
                }
              }
            }

            function checkBlobLength() {
              if (
                typeof file.length === "number" &&
                file.length > opts.maxBlobLength
              ) {
                debug(
                  "File length too large for Blob URL approach: %d (max: %d)",
                  file.length,
                  opts.maxBlobLength
                );
                fatalError(
                  new Error(
                    `File length too large for Blob URL approach: ${file.length} (max: ${opts.maxBlobLength})`
                  )
                );
                return false;
              }
              return true;
            }

            function renderMediaElement(type) {
              if (!checkBlobLength()) return;

              elem = getElem(type);
              getBlobURL(file, (err, url) => {
                if (err) return fatalError(err);
                elem.addEventListener("error", fatalError);
                elem.addEventListener("loadstart", onLoadStart);
                elem.addEventListener("loadedmetadata", onLoadedMetadata);
                elem.src = url;
              });
            }

            function onLoadStart() {
              elem.removeEventListener("loadstart", onLoadStart);
              if (opts.autoplay) {
                const playPromise = elem.play();
                if (typeof playPromise !== "undefined")
                  playPromise.catch(fatalError);
              }
            }

            function onLoadedMetadata() {
              elem.removeEventListener("loadedmetadata", onLoadedMetadata);
              cb(null, elem);
            }

            function renderImage() {
              elem = getElem("img");
              getBlobURL(file, (err, url) => {
                if (err) return fatalError(err);
                elem.src = url;
                elem.alt = file.name;
                cb(null, elem);
              });
            }

            function renderIframe() {
              getBlobURL(file, (err, url) => {
                if (err) return fatalError(err);

                if (extname !== ".pdf") {
                  // Render iframe
                  elem = getElem("iframe");
                  elem.sandbox = "allow-forms allow-scripts";
                  elem.src = url;
                } else {
                  // Render .pdf
                  elem = getElem("object");
                  // Firefox-only: `typemustmatch` keeps the embedded file from running unless
                  // its content type matches the specified `type` attribute
                  elem.setAttribute("typemustmatch", true);
                  elem.setAttribute("type", "application/pdf");
                  elem.setAttribute("data", url);
                }
                cb(null, elem);
              });
            }

            function tryRenderIframe() {
              debug(
                'Unknown file extension "%s" - will attempt to render into iframe',
                extname
              );

              let str = "";
              file
                .createReadStream({ start: 0, end: 1000 })
                .setEncoding("utf8")
                .on("data", (chunk) => {
                  str += chunk;
                })
                .on("end", done)
                .on("error", cb);

              function done() {
                if (isAscii(str)) {
                  debug(
                    'File extension "%s" appears ascii, so will render.',
                    extname
                  );
                  renderIframe();
                } else {
                  debug(
                    'File extension "%s" appears non-ascii, will not render.',
                    extname
                  );
                  cb(
                    new Error(
                      `Unsupported file type "${extname}": Cannot append to DOM`
                    )
                  );
                }
              }
            }

            function fatalError(err) {
              err.message = `Error rendering file "${file.name}": ${err.message}`;
              debug(err.message);
              cb(err);
            }
          }

          function getBlobURL(file, cb) {
            const extname = path.extname(file.name).toLowerCase();
            streamToBlobURL(
              file.createReadStream(),
              exports.mime[extname]
            ).then(
              (blobUrl) => cb(null, blobUrl),
              (err) => cb(err)
            );
          }

          function validateFile(file) {
            if (file == null) {
              throw new Error("file cannot be null or undefined");
            }
            if (typeof file.name !== "string") {
              throw new Error("missing or invalid file.name property");
            }
            if (typeof file.createReadStream !== "function") {
              throw new Error(
                "missing or invalid file.createReadStream property"
              );
            }
          }

          function getCodec(name) {
            const extname = path.extname(name).toLowerCase();
            return {
              ".m4a": 'audio/mp4; codecs="mp4a.40.5"',
              ".m4b": 'audio/mp4; codecs="mp4a.40.5"',
              ".m4p": 'audio/mp4; codecs="mp4a.40.5"',
              ".m4v": 'video/mp4; codecs="avc1.640029, mp4a.40.5"',
              ".mkv": 'video/webm; codecs="avc1.640029, mp4a.40.5"',
              ".mp3": "audio/mpeg",
              ".mp4": 'video/mp4; codecs="avc1.640029, mp4a.40.5"',
              ".webm": 'video/webm; codecs="vorbis, vp8"',
            }[extname];
          }

          function parseOpts(opts) {
            if (opts.autoplay == null) opts.autoplay = false;
            if (opts.muted == null) opts.muted = false;
            if (opts.controls == null) opts.controls = true;
            if (opts.maxBlobLength == null)
              opts.maxBlobLength = MAX_BLOB_LENGTH;
          }

          function setMediaOpts(elem, opts) {
            elem.autoplay = !!opts.autoplay;
            elem.muted = !!opts.muted;
            elem.controls = !!opts.controls;
          }
        },
        {
          "./lib/mime.json": 51,
          debug: 9,
          "is-ascii": 15,
          mediasource: 16,
          path: 29,
          "stream-to-blob-url": 54,
          videostream: 62,
        },
      ],
      51: [
        function (require, module, exports) {
          module.exports = {
            ".3gp": "video/3gpp",
            ".aac": "audio/aac",
            ".aif": "audio/x-aiff",
            ".aiff": "audio/x-aiff",
            ".atom": "application/atom+xml",
            ".avi": "video/x-msvideo",
            ".bmp": "image/bmp",
            ".bz2": "application/x-bzip2",
            ".conf": "text/plain",
            ".css": "text/css",
            ".csv": "text/plain",
            ".diff": "text/x-diff",
            ".doc": "application/msword",
            ".flv": "video/x-flv",
            ".gif": "image/gif",
            ".gz": "application/x-gzip",
            ".htm": "text/html",
            ".html": "text/html",
            ".ico": "image/vnd.microsoft.icon",
            ".ics": "text/calendar",
            ".iso": "application/octet-stream",
            ".jar": "application/java-archive",
            ".jpeg": "image/jpeg",
            ".jpg": "image/jpeg",
            ".js": "application/javascript",
            ".json": "application/json",
            ".less": "text/css",
            ".log": "text/plain",
            ".m3u": "audio/x-mpegurl",
            ".m4a": "audio/x-m4a",
            ".m4b": "audio/mp4",
            ".m4p": "audio/mp4",
            ".m4v": "video/x-m4v",
            ".manifest": "text/cache-manifest",
            ".markdown": "text/x-markdown",
            ".mathml": "application/mathml+xml",
            ".md": "text/x-markdown",
            ".mid": "audio/midi",
            ".midi": "audio/midi",
            ".mov": "video/quicktime",
            ".mp3": "audio/mpeg",
            ".mp4": "video/mp4",
            ".mp4v": "video/mp4",
            ".mpeg": "video/mpeg",
            ".mpg": "video/mpeg",
            ".odp": "application/vnd.oasis.opendocument.presentation",
            ".ods": "application/vnd.oasis.opendocument.spreadsheet",
            ".odt": "application/vnd.oasis.opendocument.text",
            ".oga": "audio/ogg",
            ".ogg": "application/ogg",
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".pps": "application/vnd.ms-powerpoint",
            ".ppt": "application/vnd.ms-powerpoint",
            ".ps": "application/postscript",
            ".psd": "image/vnd.adobe.photoshop",
            ".qt": "video/quicktime",
            ".rar": "application/x-rar-compressed",
            ".rdf": "application/rdf+xml",
            ".rss": "application/rss+xml",
            ".rtf": "application/rtf",
            ".svg": "image/svg+xml",
            ".svgz": "image/svg+xml",
            ".swf": "application/x-shockwave-flash",
            ".tar": "application/x-tar",
            ".tbz": "application/x-bzip-compressed-tar",
            ".text": "text/plain",
            ".tif": "image/tiff",
            ".tiff": "image/tiff",
            ".torrent": "application/x-bittorrent",
            ".ttf": "application/x-font-ttf",
            ".txt": "text/plain",
            ".wav": "audio/wav",
            ".webm": "video/webm",
            ".wma": "audio/x-ms-wma",
            ".wmv": "video/x-ms-wmv",
            ".xls": "application/vnd.ms-excel",
            ".xml": "application/xml",
            ".yaml": "text/yaml",
            ".yml": "text/yaml",
            ".zip": "application/zip",
          };
        },
        {},
      ],
      52: [
        function (require, module, exports) {
          /*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
          /* eslint-disable node/no-deprecated-api */
          var buffer = require("buffer");
          var Buffer = buffer.Buffer;

          // alternative to using Object.keys for old browsers
          function copyProps(src, dst) {
            for (var key in src) {
              dst[key] = src[key];
            }
          }
          if (
            Buffer.from &&
            Buffer.alloc &&
            Buffer.allocUnsafe &&
            Buffer.allocUnsafeSlow
          ) {
            module.exports = buffer;
          } else {
            // Copy properties from require('buffer')
            copyProps(buffer, exports);
            exports.Buffer = SafeBuffer;
          }

          function SafeBuffer(arg, encodingOrOffset, length) {
            return Buffer(arg, encodingOrOffset, length);
          }

          SafeBuffer.prototype = Object.create(Buffer.prototype);

          // Copy static methods from Buffer
          copyProps(Buffer, SafeBuffer);

          SafeBuffer.from = function (arg, encodingOrOffset, length) {
            if (typeof arg === "number") {
              throw new TypeError("Argument must not be a number");
            }
            return Buffer(arg, encodingOrOffset, length);
          };

          SafeBuffer.alloc = function (size, fill, encoding) {
            if (typeof size !== "number") {
              throw new TypeError("Argument must be a number");
            }
            var buf = Buffer(size);
            if (fill !== undefined) {
              if (typeof encoding === "string") {
                buf.fill(fill, encoding);
              } else {
                buf.fill(fill);
              }
            } else {
              buf.fill(0);
            }
            return buf;
          };

          SafeBuffer.allocUnsafe = function (size) {
            if (typeof size !== "number") {
              throw new TypeError("Argument must be a number");
            }
            return Buffer(size);
          };

          SafeBuffer.allocUnsafeSlow = function (size) {
            if (typeof size !== "number") {
              throw new TypeError("Argument must be a number");
            }
            return buffer.SlowBuffer(size);
          };
        },
        { buffer: 7 },
      ],
      53: [
        function (require, module, exports) {
          // Copyright Joyent, Inc. and other Node contributors.
          //
          // Permission is hereby granted, free of charge, to any person obtaining a
          // copy of this software and associated documentation files (the
          // "Software"), to deal in the Software without restriction, including
          // without limitation the rights to use, copy, modify, merge, publish,
          // distribute, sublicense, and/or sell copies of the Software, and to permit
          // persons to whom the Software is furnished to do so, subject to the
          // following conditions:
          //
          // The above copyright notice and this permission notice shall be included
          // in all copies or substantial portions of the Software.
          //
          // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
          // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
          // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
          // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
          // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
          // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
          // USE OR OTHER DEALINGS IN THE SOFTWARE.

          module.exports = Stream;

          var EE = require("events").EventEmitter;
          var inherits = require("inherits");

          inherits(Stream, EE);
          Stream.Readable = require("readable-stream/lib/_stream_readable.js");
          Stream.Writable = require("readable-stream/lib/_stream_writable.js");
          Stream.Duplex = require("readable-stream/lib/_stream_duplex.js");
          Stream.Transform = require("readable-stream/lib/_stream_transform.js");
          Stream.PassThrough = require("readable-stream/lib/_stream_passthrough.js");
          Stream.finished = require("readable-stream/lib/internal/streams/end-of-stream.js");
          Stream.pipeline = require("readable-stream/lib/internal/streams/pipeline.js");

          // Backwards-compat with node 0.4.x
          Stream.Stream = Stream;

          // old-style streams.  Note that the pipe method (the only relevant
          // part of this class) is overridden in the Readable class.

          function Stream() {
            EE.call(this);
          }

          Stream.prototype.pipe = function (dest, options) {
            var source = this;

            function ondata(chunk) {
              if (dest.writable) {
                if (false === dest.write(chunk) && source.pause) {
                  source.pause();
                }
              }
            }

            source.on("data", ondata);

            function ondrain() {
              if (source.readable && source.resume) {
                source.resume();
              }
            }

            dest.on("drain", ondrain);

            // If the 'end' option is not supplied, dest.end() will be called when
            // source gets the 'end' or 'close' events.  Only dest.end() once.
            if (!dest._isStdio && (!options || options.end !== false)) {
              source.on("end", onend);
              source.on("close", onclose);
            }

            var didOnEnd = false;
            function onend() {
              if (didOnEnd) return;
              didOnEnd = true;

              dest.end();
            }

            function onclose() {
              if (didOnEnd) return;
              didOnEnd = true;

              if (typeof dest.destroy === "function") dest.destroy();
            }

            // don't leave dangling pipes when there are errors.
            function onerror(er) {
              cleanup();
              if (EE.listenerCount(this, "error") === 0) {
                throw er; // Unhandled stream error in pipe.
              }
            }

            source.on("error", onerror);
            dest.on("error", onerror);

            // remove all the event listeners that were added.
            function cleanup() {
              source.removeListener("data", ondata);
              dest.removeListener("drain", ondrain);

              source.removeListener("end", onend);
              source.removeListener("close", onclose);

              source.removeListener("error", onerror);
              dest.removeListener("error", onerror);

              source.removeListener("end", cleanup);
              source.removeListener("close", cleanup);

              dest.removeListener("close", cleanup);
            }

            source.on("end", cleanup);
            source.on("close", cleanup);

            dest.on("close", cleanup);

            dest.emit("pipe", source);

            // Allow for unix-like usage: A.pipe(B).pipe(C)
            return dest;
          };
        },
        {
          events: 12,
          inherits: 14,
          "readable-stream/lib/_stream_duplex.js": 36,
          "readable-stream/lib/_stream_passthrough.js": 37,
          "readable-stream/lib/_stream_readable.js": 38,
          "readable-stream/lib/_stream_transform.js": 39,
          "readable-stream/lib/_stream_writable.js": 40,
          "readable-stream/lib/internal/streams/end-of-stream.js": 44,
          "readable-stream/lib/internal/streams/pipeline.js": 46,
        },
      ],
      54: [
        function (require, module, exports) {
          /*! stream-to-blob-url. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
          module.exports = getBlobURL;

          const getBlob = require("stream-to-blob");

          async function getBlobURL(stream, mimeType) {
            const blob = await getBlob(stream, mimeType);
            const url = URL.createObjectURL(blob);
            return url;
          }
        },
        { "stream-to-blob": 55 },
      ],
      55: [
        function (require, module, exports) {
          /*! stream-to-blob. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
          /* global Blob */

          module.exports = streamToBlob;

          function streamToBlob(stream, mimeType) {
            if (mimeType != null && typeof mimeType !== "string") {
              throw new Error("Invalid mimetype, expected string.");
            }
            return new Promise((resolve, reject) => {
              const chunks = [];
              stream
                .on("data", (chunk) => chunks.push(chunk))
                .once("end", () => {
                  const blob =
                    mimeType != null
                      ? new Blob(chunks, { type: mimeType })
                      : new Blob(chunks);
                  resolve(blob);
                })
                .once("error", reject);
            });
          }
        },
        {},
      ],
      56: [
        function (require, module, exports) {
          (function (Buffer) {
            (function () {
              /*! stream-with-known-length-to-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
              var once = require("once");

              module.exports = function getBuffer(stream, length, cb) {
                cb = once(cb);
                var buf = Buffer.alloc(length);
                var offset = 0;
                stream
                  .on("data", function (chunk) {
                    chunk.copy(buf, offset);
                    offset += chunk.length;
                  })
                  .on("end", function () {
                    cb(null, buf);
                  })
                  .on("error", cb);
              };
            }.call(this));
          }.call(this, require("buffer").Buffer));
        },
        { buffer: 7, once: 28 },
      ],
      57: [
        function (require, module, exports) {
          // Copyright Joyent, Inc. and other Node contributors.
          //
          // Permission is hereby granted, free of charge, to any person obtaining a
          // copy of this software and associated documentation files (the
          // "Software"), to deal in the Software without restriction, including
          // without limitation the rights to use, copy, modify, merge, publish,
          // distribute, sublicense, and/or sell copies of the Software, and to permit
          // persons to whom the Software is furnished to do so, subject to the
          // following conditions:
          //
          // The above copyright notice and this permission notice shall be included
          // in all copies or substantial portions of the Software.
          //
          // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
          // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
          // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
          // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
          // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
          // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
          // USE OR OTHER DEALINGS IN THE SOFTWARE.

          "use strict";

          /*<replacement>*/

          var Buffer = require("safe-buffer").Buffer;
          /*</replacement>*/

          var isEncoding =
            Buffer.isEncoding ||
            function (encoding) {
              encoding = "" + encoding;
              switch (encoding && encoding.toLowerCase()) {
                case "hex":
                case "utf8":
                case "utf-8":
                case "ascii":
                case "binary":
                case "base64":
                case "ucs2":
                case "ucs-2":
                case "utf16le":
                case "utf-16le":
                case "raw":
                  return true;
                default:
                  return false;
              }
            };

          function _normalizeEncoding(enc) {
            if (!enc) return "utf8";
            var retried;
            while (true) {
              switch (enc) {
                case "utf8":
                case "utf-8":
                  return "utf8";
                case "ucs2":
                case "ucs-2":
                case "utf16le":
                case "utf-16le":
                  return "utf16le";
                case "latin1":
                case "binary":
                  return "latin1";
                case "base64":
                case "ascii":
                case "hex":
                  return enc;
                default: // undefined
                  if (retried) return;
                  enc = ("" + enc).toLowerCase();
                  retried = true;
              }
            }
          }

          // Do not cache `Buffer.isEncoding` when checking encoding names as some
          // modules monkey-patch it to support additional encodings
          function normalizeEncoding(enc) {
            var nenc = _normalizeEncoding(enc);
            if (
              typeof nenc !== "string" &&
              (Buffer.isEncoding === isEncoding || !isEncoding(enc))
            )
              throw new Error("Unknown encoding: " + enc);
            return nenc || enc;
          }

          // StringDecoder provides an interface for efficiently splitting a series of
          // buffers into a series of JS strings without breaking apart multi-byte
          // characters.
          exports.StringDecoder = StringDecoder;
          function StringDecoder(encoding) {
            this.encoding = normalizeEncoding(encoding);
            var nb;
            switch (this.encoding) {
              case "utf16le":
                this.text = utf16Text;
                this.end = utf16End;
                nb = 4;
                break;
              case "utf8":
                this.fillLast = utf8FillLast;
                nb = 4;
                break;
              case "base64":
                this.text = base64Text;
                this.end = base64End;
                nb = 3;
                break;
              default:
                this.write = simpleWrite;
                this.end = simpleEnd;
                return;
            }
            this.lastNeed = 0;
            this.lastTotal = 0;
            this.lastChar = Buffer.allocUnsafe(nb);
          }

          StringDecoder.prototype.write = function (buf) {
            if (buf.length === 0) return "";
            var r;
            var i;
            if (this.lastNeed) {
              r = this.fillLast(buf);
              if (r === undefined) return "";
              i = this.lastNeed;
              this.lastNeed = 0;
            } else {
              i = 0;
            }
            if (i < buf.length)
              return r ? r + this.text(buf, i) : this.text(buf, i);
            return r || "";
          };

          StringDecoder.prototype.end = utf8End;

          // Returns only complete characters in a Buffer
          StringDecoder.prototype.text = utf8Text;

          // Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
          StringDecoder.prototype.fillLast = function (buf) {
            if (this.lastNeed <= buf.length) {
              buf.copy(
                this.lastChar,
                this.lastTotal - this.lastNeed,
                0,
                this.lastNeed
              );
              return this.lastChar.toString(this.encoding, 0, this.lastTotal);
            }
            buf.copy(
              this.lastChar,
              this.lastTotal - this.lastNeed,
              0,
              buf.length
            );
            this.lastNeed -= buf.length;
          };

          // Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
          // continuation byte. If an invalid byte is detected, -2 is returned.
          function utf8CheckByte(byte) {
            if (byte <= 0x7f) return 0;
            else if (byte >> 5 === 0x06) return 2;
            else if (byte >> 4 === 0x0e) return 3;
            else if (byte >> 3 === 0x1e) return 4;
            return byte >> 6 === 0x02 ? -1 : -2;
          }

          // Checks at most 3 bytes at the end of a Buffer in order to detect an
          // incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
          // needed to complete the UTF-8 character (if applicable) are returned.
          function utf8CheckIncomplete(self, buf, i) {
            var j = buf.length - 1;
            if (j < i) return 0;
            var nb = utf8CheckByte(buf[j]);
            if (nb >= 0) {
              if (nb > 0) self.lastNeed = nb - 1;
              return nb;
            }
            if (--j < i || nb === -2) return 0;
            nb = utf8CheckByte(buf[j]);
            if (nb >= 0) {
              if (nb > 0) self.lastNeed = nb - 2;
              return nb;
            }
            if (--j < i || nb === -2) return 0;
            nb = utf8CheckByte(buf[j]);
            if (nb >= 0) {
              if (nb > 0) {
                if (nb === 2) nb = 0;
                else self.lastNeed = nb - 3;
              }
              return nb;
            }
            return 0;
          }

          // Validates as many continuation bytes for a multi-byte UTF-8 character as
          // needed or are available. If we see a non-continuation byte where we expect
          // one, we "replace" the validated continuation bytes we've seen so far with
          // a single UTF-8 replacement character ('\ufffd'), to match v8's UTF-8 decoding
          // behavior. The continuation byte check is included three times in the case
          // where all of the continuation bytes for a character exist in the same buffer.
          // It is also done this way as a slight performance increase instead of using a
          // loop.
          function utf8CheckExtraBytes(self, buf, p) {
            if ((buf[0] & 0xc0) !== 0x80) {
              self.lastNeed = 0;
              return "\ufffd";
            }
            if (self.lastNeed > 1 && buf.length > 1) {
              if ((buf[1] & 0xc0) !== 0x80) {
                self.lastNeed = 1;
                return "\ufffd";
              }
              if (self.lastNeed > 2 && buf.length > 2) {
                if ((buf[2] & 0xc0) !== 0x80) {
                  self.lastNeed = 2;
                  return "\ufffd";
                }
              }
            }
          }

          // Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
          function utf8FillLast(buf) {
            var p = this.lastTotal - this.lastNeed;
            var r = utf8CheckExtraBytes(this, buf, p);
            if (r !== undefined) return r;
            if (this.lastNeed <= buf.length) {
              buf.copy(this.lastChar, p, 0, this.lastNeed);
              return this.lastChar.toString(this.encoding, 0, this.lastTotal);
            }
            buf.copy(this.lastChar, p, 0, buf.length);
            this.lastNeed -= buf.length;
          }

          // Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
          // partial character, the character's bytes are buffered until the required
          // number of bytes are available.
          function utf8Text(buf, i) {
            var total = utf8CheckIncomplete(this, buf, i);
            if (!this.lastNeed) return buf.toString("utf8", i);
            this.lastTotal = total;
            var end = buf.length - (total - this.lastNeed);
            buf.copy(this.lastChar, 0, end);
            return buf.toString("utf8", i, end);
          }

          // For UTF-8, a replacement character is added when ending on a partial
          // character.
          function utf8End(buf) {
            var r = buf && buf.length ? this.write(buf) : "";
            if (this.lastNeed) return r + "\ufffd";
            return r;
          }

          // UTF-16LE typically needs two bytes per character, but even if we have an even
          // number of bytes available, we need to check if we end on a leading/high
          // surrogate. In that case, we need to wait for the next two bytes in order to
          // decode the last character properly.
          function utf16Text(buf, i) {
            if ((buf.length - i) % 2 === 0) {
              var r = buf.toString("utf16le", i);
              if (r) {
                var c = r.charCodeAt(r.length - 1);
                if (c >= 0xd800 && c <= 0xdbff) {
                  this.lastNeed = 2;
                  this.lastTotal = 4;
                  this.lastChar[0] = buf[buf.length - 2];
                  this.lastChar[1] = buf[buf.length - 1];
                  return r.slice(0, -1);
                }
              }
              return r;
            }
            this.lastNeed = 1;
            this.lastTotal = 2;
            this.lastChar[0] = buf[buf.length - 1];
            return buf.toString("utf16le", i, buf.length - 1);
          }

          // For UTF-16LE we do not explicitly append special replacement characters if we
          // end on a partial character, we simply let v8 handle that.
          function utf16End(buf) {
            var r = buf && buf.length ? this.write(buf) : "";
            if (this.lastNeed) {
              var end = this.lastTotal - this.lastNeed;
              return r + this.lastChar.toString("utf16le", 0, end);
            }
            return r;
          }

          function base64Text(buf, i) {
            var n = (buf.length - i) % 3;
            if (n === 0) return buf.toString("base64", i);
            this.lastNeed = 3 - n;
            this.lastTotal = 3;
            if (n === 1) {
              this.lastChar[0] = buf[buf.length - 1];
            } else {
              this.lastChar[0] = buf[buf.length - 2];
              this.lastChar[1] = buf[buf.length - 1];
            }
            return buf.toString("base64", i, buf.length - n);
          }

          function base64End(buf) {
            var r = buf && buf.length ? this.write(buf) : "";
            if (this.lastNeed)
              return r + this.lastChar.toString("base64", 0, 3 - this.lastNeed);
            return r;
          }

          // Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
          function simpleWrite(buf) {
            return buf.toString(this.encoding);
          }

          function simpleEnd(buf) {
            return buf && buf.length ? this.write(buf) : "";
          }
        },
        { "safe-buffer": 52 },
      ],
      58: [
        function (require, module, exports) {
          var Buffer = require("buffer").Buffer;

          module.exports = function (buf) {
            // If the buffer is backed by a Uint8Array, a faster version will work
            if (buf instanceof Uint8Array) {
              // If the buffer isn't a subarray, return the underlying ArrayBuffer
              if (
                buf.byteOffset === 0 &&
                buf.byteLength === buf.buffer.byteLength
              ) {
                return buf.buffer;
              } else if (typeof buf.buffer.slice === "function") {
                // Otherwise we need to get a proper copy
                return buf.buffer.slice(
                  buf.byteOffset,
                  buf.byteOffset + buf.byteLength
                );
              }
            }

            if (Buffer.isBuffer(buf)) {
              // This is the slow version that will work with any Buffer
              // implementation (even in old browsers)
              var arrayCopy = new Uint8Array(buf.length);
              var len = buf.length;
              for (var i = 0; i < len; i++) {
                arrayCopy[i] = buf[i];
              }
              return arrayCopy.buffer;
            } else {
              throw new Error("Argument must be a Buffer");
            }
          };
        },
        { buffer: 7 },
      ],
      59: [
        function (require, module, exports) {
          var bufferAlloc = require("buffer-alloc");

          var UINT_32_MAX = Math.pow(2, 32);

          exports.encodingLength = function () {
            return 8;
          };

          exports.encode = function (num, buf, offset) {
            if (!buf) buf = bufferAlloc(8);
            if (!offset) offset = 0;

            var top = Math.floor(num / UINT_32_MAX);
            var rem = num - top * UINT_32_MAX;

            buf.writeUInt32BE(top, offset);
            buf.writeUInt32BE(rem, offset + 4);
            return buf;
          };

          exports.decode = function (buf, offset) {
            if (!offset) offset = 0;

            var top = buf.readUInt32BE(offset);
            var rem = buf.readUInt32BE(offset + 4);

            return top * UINT_32_MAX + rem;
          };

          exports.encode.bytes = 8;
          exports.decode.bytes = 8;
        },
        { "buffer-alloc": 5 },
      ],
      60: [
        function (require, module, exports) {
          (function (global) {
            (function () {
              /**
               * Module exports.
               */

              module.exports = deprecate;

              /**
               * Mark that a method should not be used.
               * Returns a modified function which warns once by default.
               *
               * If `localStorage.noDeprecation = true` is set, then it is a no-op.
               *
               * If `localStorage.throwDeprecation = true` is set, then deprecated functions
               * will throw an Error when invoked.
               *
               * If `localStorage.traceDeprecation = true` is set, then deprecated functions
               * will invoke `console.trace()` instead of `console.error()`.
               *
               * @param {Function} fn - the function to deprecate
               * @param {String} msg - the string to print to the console when `fn` is invoked
               * @returns {Function} a new "deprecated" version of `fn`
               * @api public
               */

              function deprecate(fn, msg) {
                if (config("noDeprecation")) {
                  return fn;
                }

                var warned = false;
                function deprecated() {
                  if (!warned) {
                    if (config("throwDeprecation")) {
                      throw new Error(msg);
                    } else if (config("traceDeprecation")) {
                      console.trace(msg);
                    } else {
                      console.warn(msg);
                    }
                    warned = true;
                  }
                  return fn.apply(this, arguments);
                }

                return deprecated;
              }

              /**
               * Checks `localStorage` for boolean values for the given `name`.
               *
               * @param {String} name
               * @returns {Boolean}
               * @api private
               */

              function config(name) {
                // accessing global.localStorage can trigger a DOMException in sandboxed iframes
                try {
                  if (!global.localStorage) return false;
                } catch (_) {
                  return false;
                }
                var val = global.localStorage[name];
                if (null == val) return false;
                return String(val).toLowerCase() === "true";
              }
            }.call(this));
          }.call(
            this,
            typeof global !== "undefined"
              ? global
              : typeof self !== "undefined"
              ? self
              : typeof window !== "undefined"
              ? window
              : {}
          ));
        },
        {},
      ],
      61: [
        function (require, module, exports) {
          (function (Buffer) {
            (function () {
              const bs = require("binary-search");
              const EventEmitter = require("events");
              const mp4 = require("mp4-stream");
              const Box = require("mp4-box-encoding");
              const RangeSliceStream = require("range-slice-stream");

              // if we want to ignore more than this many bytes, request a new stream.
              // if we want to ignore fewer, just skip them.
              const FIND_MOOV_SEEK_SIZE = 4096;

              class MP4Remuxer extends EventEmitter {
                constructor(file) {
                  super();

                  this._tracks = [];
                  this._file = file;
                  this._decoder = null;
                  this._findMoov(0);
                }

                _findMoov(offset) {
                  if (this._decoder) {
                    this._decoder.destroy();
                  }

                  let toSkip = 0;
                  this._decoder = mp4.decode();
                  const fileStream = this._file.createReadStream({
                    start: offset,
                  });
                  fileStream.pipe(this._decoder);

                  const boxHandler = (headers) => {
                    if (headers.type === "moov") {
                      this._decoder.removeListener("box", boxHandler);
                      this._decoder.decode((moov) => {
                        fileStream.destroy();
                        try {
                          this._processMoov(moov);
                        } catch (err) {
                          err.message = `Cannot parse mp4 file: ${err.message}`;
                          this.emit("error", err);
                        }
                      });
                    } else if (headers.length < FIND_MOOV_SEEK_SIZE) {
                      toSkip += headers.length;
                      this._decoder.ignore();
                    } else {
                      this._decoder.removeListener("box", boxHandler);
                      toSkip += headers.length;
                      fileStream.destroy();
                      this._decoder.destroy();
                      this._findMoov(offset + toSkip);
                    }
                  };
                  this._decoder.on("box", boxHandler);
                }

                _processMoov(moov) {
                  const traks = moov.traks;
                  this._tracks = [];
                  this._hasVideo = false;
                  this._hasAudio = false;
                  for (let i = 0; i < traks.length; i++) {
                    const trak = traks[i];
                    const stbl = trak.mdia.minf.stbl;
                    const stsdEntry = stbl.stsd.entries[0];
                    const handlerType = trak.mdia.hdlr.handlerType;
                    let codec;
                    let mime;
                    if (handlerType === "vide" && stsdEntry.type === "avc1") {
                      if (this._hasVideo) {
                        continue;
                      }
                      this._hasVideo = true;
                      codec = "avc1";
                      if (stsdEntry.avcC) {
                        codec += `.${stsdEntry.avcC.mimeCodec}`;
                      }
                      mime = `video/mp4; codecs="${codec}"`;
                    } else if (
                      handlerType === "soun" &&
                      stsdEntry.type === "mp4a"
                    ) {
                      if (this._hasAudio) {
                        continue;
                      }
                      this._hasAudio = true;
                      codec = "mp4a";
                      if (stsdEntry.esds && stsdEntry.esds.mimeCodec) {
                        codec += `.${stsdEntry.esds.mimeCodec}`;
                      }
                      mime = `audio/mp4; codecs="${codec}"`;

                      // stsdEntry.children[0].buffer[19] = 0;
                      // stsdEntry.children[0].buffer[20] = 209;
                      // stsdEntry.children[0].buffer[21] = 118;
                      // stsdEntry.children[0].buffer[23] = 0;
                      // stsdEntry.children[0].buffer[24] = 209;
                      // stsdEntry.children[0].buffer[25] = 110;

                      // stsdEntry.esds.buffer[19] = 0;
                      // stsdEntry.esds.buffer[20] = 209;
                      // stsdEntry.esds.buffer[21] = 118;
                      // stsdEntry.esds.buffer[23] = 0;
                      // stsdEntry.esds.buffer[24] = 209;
                      // stsdEntry.esds.buffer[25] = 110;

                      stsdEntry.sampleSize = 16;

                      // trak.tkhd.alternateGroup = 1;
                      // trak.mdia.mdhd.timeScale = 48000;
                    } else {
                      continue;
                    }

                    const samples = [];
                    let sample = 0;

                    // Chunk/position data
                    let sampleInChunk = 0;
                    let chunk = 0;
                    let offsetInChunk = 0;
                    let sampleToChunkIndex = 0;

                    // Time data
                    let dts = 0;
                    const decodingTimeEntry = new RunLengthIndex(
                      stbl.stts.entries
                    );
                    let presentationOffsetEntry = null;
                    if (stbl.ctts) {
                      presentationOffsetEntry = new RunLengthIndex(
                        stbl.ctts.entries
                      );
                    }

                    // Sync table index
                    let syncSampleIndex = 0;

                    while (true) {
                      var currChunkEntry =
                        stbl.stsc.entries[sampleToChunkIndex];

                      // Compute size
                      const size = stbl.stsz.entries[sample];

                      // Compute time data
                      const duration = decodingTimeEntry.value.duration;
                      const presentationOffset = presentationOffsetEntry
                        ? presentationOffsetEntry.value.compositionOffset
                        : 0;

                      // Compute sync
                      let sync = true;
                      if (stbl.stss) {
                        sync =
                          stbl.stss.entries[syncSampleIndex] === sample + 1;
                      }

                      // Create new sample entry
                      const chunkOffsetTable = stbl.stco || stbl.co64;
                      samples.push({
                        size,
                        duration,
                        dts,
                        presentationOffset,
                        sync,
                        offset: offsetInChunk + chunkOffsetTable.entries[chunk],
                      });

                      // Go to next sample
                      sample++;
                      if (sample >= stbl.stsz.entries.length) {
                        break;
                      }

                      // Move position/chunk
                      sampleInChunk++;
                      offsetInChunk += size;
                      if (sampleInChunk >= currChunkEntry.samplesPerChunk) {
                        // Move to new chunk
                        sampleInChunk = 0;
                        offsetInChunk = 0;
                        chunk++;
                        // Move sample to chunk box index
                        const nextChunkEntry =
                          stbl.stsc.entries[sampleToChunkIndex + 1];
                        if (
                          nextChunkEntry &&
                          chunk + 1 >= nextChunkEntry.firstChunk
                        ) {
                          sampleToChunkIndex++;
                        }
                      }

                      // Move time forward
                      dts += duration;
                      decodingTimeEntry.inc();
                      presentationOffsetEntry && presentationOffsetEntry.inc();

                      // Move sync table index
                      if (sync) {
                        syncSampleIndex++;
                      }
                    }

                    trak.mdia.mdhd.duration = 0;
                    trak.tkhd.duration = 0;

                    const defaultSampleDescriptionIndex =
                      currChunkEntry.sampleDescriptionId;

                    const trackMoov = {
                      type: "moov",
                      mvhd: moov.mvhd,
                      traks: [
                        {
                          tkhd: trak.tkhd,
                          mdia: {
                            mdhd: trak.mdia.mdhd,
                            hdlr: trak.mdia.hdlr,
                            elng: trak.mdia.elng,
                            minf: {
                              vmhd: trak.mdia.minf.vmhd,
                              smhd: trak.mdia.minf.smhd,
                              dinf: trak.mdia.minf.dinf,
                              stbl: {
                                stsd: stbl.stsd,
                                stts: empty(),
                                ctts: empty(),
                                stsc: empty(),
                                stsz: empty(),
                                stco: empty(),
                                stss: empty(),
                              },
                            },
                          },
                        },
                      ],
                      mvex: {
                        mehd: {
                          fragmentDuration: moov.mvhd.duration,
                        },
                        trexs: [
                          {
                            trackId: trak.tkhd.trackId,
                            defaultSampleDescriptionIndex,
                            defaultSampleDuration: 0,
                            defaultSampleSize: 0,
                            defaultSampleFlags: 0,
                          },
                        ],
                      },
                    };

                    console.log('trackMoov', trackMoov);

                    this._tracks.push({
                      fragmentSequence: 1,
                      trackId: trak.tkhd.trackId,
                      timeScale: trak.mdia.mdhd.timeScale,
                      samples,
                      currSample: null,
                      currTime: null,
                      moov: trackMoov,
                      mime,
                    });
                  }

                  if (this._tracks.length === 0) {
                    this.emit("error", new Error("no playable tracks"));
                    return;
                  }

                  // Must be set last since this is used above
                  moov.mvhd.duration = 0;

                  this._ftyp = {
                    type: "ftyp",
                    brand: "iso5",
                    brandVersion: 0,
                    compatibleBrands: ["iso5"],
                  };

                  const ftypBuf = Box.encode(this._ftyp);
                  const data = this._tracks.map((track) => {
                    const moovBuf = Box.encode(track.moov);
                    return {
                      mime: track.mime,
                      init: Buffer.concat([ftypBuf, moovBuf]),
                    };
                  });

                  this.emit("ready", data);
                }

                seek(time) {
                  if (!this._tracks) {
                    throw new Error("Not ready yet; wait for 'ready' event");
                  }

                  if (this._fileStream) {
                    this._fileStream.destroy();
                    this._fileStream = null;
                  }

                  let startOffset = -1;
                  this._tracks.map((track, i) => {
                    // find the keyframe before the time
                    // stream from there
                    if (track.outStream) {
                      track.outStream.destroy();
                    }
                    if (track.inStream) {
                      track.inStream.destroy();
                      track.inStream = null;
                    }
                    const outStream = (track.outStream = mp4.encode());
                    const fragment = this._generateFragment(i, time);
                    if (!fragment) {
                      return outStream.finalize();
                    }

                    if (
                      startOffset === -1 ||
                      fragment.ranges[0].start < startOffset
                    ) {
                      startOffset = fragment.ranges[0].start;
                    }

                    const writeFragment = (frag) => {
                      if (outStream.destroyed) return;
                      outStream.box(frag.moof, (err) => {
                        if (err) return this.emit("error", err);
                        if (outStream.destroyed) return;
                        const slicedStream = track.inStream.slice(frag.ranges);
                        slicedStream.pipe(
                          outStream.mediaData(frag.length, (err) => {
                            if (err) return this.emit("error", err);
                            if (outStream.destroyed) return;
                            const nextFrag = this._generateFragment(i);
                            if (!nextFrag) {
                              return outStream.finalize();
                            }
                            writeFragment(nextFrag);
                          })
                        );
                      });
                    };
                    writeFragment(fragment);
                  });

                  if (startOffset >= 0) {
                    const fileStream = (this._fileStream =
                      this._file.createReadStream({
                        start: startOffset,
                      }));

                    this._tracks.forEach((track) => {
                      track.inStream = new RangeSliceStream(startOffset, {
                        // Allow up to a 10MB offset between audio and video,
                        // which should be fine for any reasonable interleaving
                        // interval and bitrate
                        highWaterMark: 10000000,
                      });
                      fileStream.pipe(track.inStream);
                    });
                  }

                  return this._tracks.map((track) => {
                    return track.outStream;
                  });
                }

                _findSampleBefore(trackInd, time) {
                  const track = this._tracks[trackInd];
                  const scaledTime = Math.floor(track.timeScale * time);
                  let sample = bs(track.samples, scaledTime, (sample, t) => {
                    const pts = sample.dts + sample.presentationOffset; // - track.editShift
                    return pts - t;
                  });
                  if (sample === -1) {
                    sample = 0;
                  } else if (sample < 0) {
                    sample = -sample - 2;
                  }
                  // sample is now the last sample with dts <= time
                  // Find the preceeding sync sample
                  while (!track.samples[sample].sync) {
                    sample--;
                  }
                  return sample;
                }

                _generateFragment(track, time) {
                  /*
        1. Find correct sample
        2. Process backward until sync sample found
        3. Process forward until next sync sample after MIN_FRAGMENT_DURATION found
        */
                  const currTrack = this._tracks[track];
                  let firstSample;
                  if (time !== undefined) {
                    firstSample = this._findSampleBefore(track, time);
                  } else {
                    firstSample = currTrack.currSample;
                  }

                  if (firstSample >= currTrack.samples.length) {
                    return null;
                  }

                  const startDts = currTrack.samples[firstSample].dts;

                  let totalLen = 0;
                  const ranges = [];
                  for (
                    var currSample = firstSample;
                    currSample < currTrack.samples.length;
                    currSample++
                  ) {
                    const sample = currTrack.samples[currSample];
                    if (
                      sample.sync &&
                      sample.dts - startDts >=
                        currTrack.timeScale * MIN_FRAGMENT_DURATION
                    ) {
                      break; // This is a reasonable place to end the fragment
                    }

                    totalLen += sample.size;
                    const currRange = ranges.length - 1;
                    if (
                      currRange < 0 ||
                      ranges[currRange].end !== sample.offset
                    ) {
                      // Push a new range
                      ranges.push({
                        start: sample.offset,
                        end: sample.offset + sample.size,
                      });
                    } else {
                      ranges[currRange].end += sample.size;
                    }
                  }

                  currTrack.currSample = currSample;

                  return {
                    moof: this._generateMoof(track, firstSample, currSample),
                    ranges,
                    length: totalLen,
                  };
                }

                _generateMoof(track, firstSample, lastSample) {
                  const currTrack = this._tracks[track];

                  const entries = [];
                  let trunVersion = 0;
                  for (let j = firstSample; j < lastSample; j++) {
                    const currSample = currTrack.samples[j];
                    if (currSample.presentationOffset < 0) {
                      trunVersion = 1;
                    }
                    entries.push({
                      sampleDuration: currSample.duration,
                      sampleSize: currSample.size,
                      sampleFlags: currSample.sync ? 0x2000000 : 0x1010000,
                      sampleCompositionTimeOffset:
                        currSample.presentationOffset,
                    });
                  }

                  const moof = {
                    type: "moof",
                    mfhd: {
                      sequenceNumber: currTrack.fragmentSequence++,
                    },
                    trafs: [
                      {
                        tfhd: {
                          flags: 0x20000, // default-base-is-moof
                          trackId: currTrack.trackId,
                        },
                        tfdt: {
                          baseMediaDecodeTime:
                            currTrack.samples[firstSample].dts,
                        },
                        trun: {
                          flags: 0xf01,
                          dataOffset: 8, // The moof size has to be added to this later as well
                          entries,
                          version: trunVersion,
                        },
                      },
                    ],
                  };

                  // Update the offset
                  moof.trafs[0].trun.dataOffset += Box.encodingLength(moof);

                  return moof;
                }
              }

              class RunLengthIndex {
                constructor(entries, countName) {
                  this._entries = entries;
                  this._countName = countName || "count";
                  this._index = 0;
                  this._offset = 0;

                  this.value = this._entries[0];
                }

                inc() {
                  this._offset++;
                  if (
                    this._offset >= this._entries[this._index][this._countName]
                  ) {
                    this._index++;
                    this._offset = 0;
                  }

                  this.value = this._entries[this._index];
                }
              }

              function empty() {
                return {
                  version: 0,
                  flags: 0,
                  entries: [],
                };
              }

              const MIN_FRAGMENT_DURATION = 1; // second

              module.exports = MP4Remuxer;
            }.call(this));
          }.call(this, require("buffer").Buffer));
        },
        {
          "binary-search": 2,
          buffer: 7,
          events: 12,
          "mp4-box-encoding": 23,
          "mp4-stream": 26,
          "range-slice-stream": 34,
        },
      ],
      62: [
        function (require, module, exports) {
          const MediaElementWrapper = require("mediasource");
          const pump = require("pump");

          const MP4Remuxer = require("./mp4-remuxer");

          function VideoStream(file, mediaElem, opts = {}) {
            if (!(this instanceof VideoStream)) {
              console.warn(
                "Don't invoke VideoStream without the 'new' keyword."
              );
              return new VideoStream(file, mediaElem, opts);
            }

            this.detailedError = null;

            this._elem = mediaElem;
            this._elemWrapper = new MediaElementWrapper(mediaElem);
            this._waitingFired = false;
            this._trackMeta = null;
            this._file = file;
            this._tracks = null;

            if (this._elem.preload !== "none") {
              this._createMuxer();
            }

            this._onError = () => {
              this.detailedError = this._elemWrapper.detailedError;
              this.destroy(); // don't pass err though so the user doesn't need to listen for errors
            };

            this._onWaiting = () => {
              this._waitingFired = true;
              if (!this._muxer) {
                this._createMuxer();
              } else if (this._tracks) {
                this._pump();
              }
            };

            if (mediaElem.autoplay) {
              mediaElem.preload = "auto";
            }
            mediaElem.addEventListener("waiting", this._onWaiting);
            mediaElem.addEventListener("error", this._onError);
          }

          VideoStream.prototype = {
            _createMuxer() {
              this._muxer = new MP4Remuxer(this._file);
              this._muxer.on("ready", (data) => {
                this._tracks = data
                  .filter((x) => x.mime.includes("o"))
                  .map((trackData) => {
                    const mediaSource = this._elemWrapper.createWriteStream(
                      trackData.mime
                    );
                    mediaSource.on("error", (err) => {
                      this._elemWrapper.error(err);
                    });
                    const track = {
                      muxed: null,
                      mediaSource,
                      initFlushed: false,
                      onInitFlushed: null,
                    };
                    mediaSource.write(trackData.init, (err) => {
                      track.initFlushed = true;
                      if (track.onInitFlushed) {
                        track.onInitFlushed(err);
                      }
                    });
                    return track;
                  });

                if (this._waitingFired || this._elem.preload === "auto") {
                  this._pump();
                }
              });

              this._muxer.on("error", (err) => {
                this._elemWrapper.error(err);
              });
            },
            _pump() {
              const muxed = this._muxer.seek(
                this._elem.currentTime,
                !this._tracks
              );

              this._tracks.forEach((track, i) => {
                const pumpTrack = () => {
                  if (track.muxed) {
                    track.muxed.destroy();
                    track.mediaSource = this._elemWrapper.createWriteStream(
                      track.mediaSource
                    );
                    track.mediaSource.on("error", (err) => {
                      this._elemWrapper.error(err);
                    });
                  }
                  track.muxed = muxed[i];
                  pump(track.muxed, track.mediaSource);
                };
                if (!track.initFlushed) {
                  track.onInitFlushed = (err) => {
                    if (err) {
                      this._elemWrapper.error(err);
                      return;
                    }
                    pumpTrack();
                  };
                } else {
                  pumpTrack();
                }
              });
            },
            destroy() {
              if (this.destroyed) {
                return;
              }
              this.destroyed = true;

              this._elem.removeEventListener("waiting", this._onWaiting);
              this._elem.removeEventListener("error", this._onError);

              if (this._tracks) {
                this._tracks.forEach((track) => {
                  if (track.muxed) {
                    track.muxed.destroy();
                  }
                });
              }

              this._elem.src = "";
            },
          };

          module.exports = VideoStream;
        },
        { "./mp4-remuxer": 61, mediasource: 16, pump: 31 },
      ],
      63: [
        function (require, module, exports) {
          // Returns a wrapper function that returns a wrapped callback
          // The wrapper function should do some stuff, and return a
          // presumably different callback function.
          // This makes sure that own properties are retained, so that
          // decorations and such are not lost along the way.
          module.exports = wrappy;
          function wrappy(fn, cb) {
            if (fn && cb) return wrappy(fn)(cb);

            if (typeof fn !== "function")
              throw new TypeError("need wrapper function");

            Object.keys(fn).forEach(function (k) {
              wrapper[k] = fn[k];
            });

            return wrapper;

            function wrapper() {
              var args = new Array(arguments.length);
              for (var i = 0; i < args.length; i++) {
                args[i] = arguments[i];
              }
              var ret = fn.apply(this, args);
              var cb = args[args.length - 1];
              if (typeof ret === "function" && ret !== cb) {
                Object.keys(cb).forEach(function (k) {
                  ret[k] = cb[k];
                });
              }
              return ret;
            }
          }
        },
        {},
      ],
      64: [
        function (require, module, exports) {
          const stream = require("stream");
          const debugFactory = require("debug");
          const eos = require("end-of-stream");

          const debug = debugFactory("webtorrent:file-stream");

          /**
           * Readable stream of a torrent file
           *
           * @param {File} file
           * @param {Object} opts
           * @param {number} opts.start stream slice of file, starting from this byte (inclusive)
           * @param {number} opts.end stream slice of file, ending with this byte (inclusive)
           */
          class FileStream extends stream.Readable {
            constructor(file, opts) {
              super(opts);

              this._file = file;
              const start = (opts && opts.start) || 0;
              const end =
                opts && opts.end && opts.end < file.length
                  ? opts.end
                  : file.length - 1;

              const pieceLength = file.pieceLength;

              this.pieceLength = pieceLength;

              this._startPiece = ((start + file.offset) / pieceLength) | 0;
              this._endPiece = ((end + file.offset) / pieceLength) | 0;

              this._piece = this._startPiece;
              this._offset =
                start + file.offset - this._startPiece * pieceLength;

              this._missing = end - start + 1;
              this._reading = false;
              this._notifying = false;
              this._criticalLength = Math.min(
                ((1024 * 1024) / pieceLength) | 0,
                2
              );

              // this._torrent.select(this._startPiece, this._endPiece, true, () => {
              //   this._notify()
              // })

              // Ensure that cleanup happens even if destroy() is never called (readable-stream v3 currently doesn't call it automaticallly)
              eos(this, (err) => {
                this.destroy(err);
              });
            }

            _read() {
              if (this._reading) return;
              this._reading = true;
              this._notify();
            }

            _notify() {
              if (!this._reading || this._missing === 0) return;
              // if (!this._torrent.bitfield.get(this._piece)) {
              //   return this._torrent.critical(this._piece, this._piece + this._criticalLength)
              // }

              if (this._notifying) return;
              this._notifying = true;

              // if (this._torrent.destroyed) return this.destroy(new Error('Torrent removed'))

              const p = this._piece;

              const getOpts = {};
              // Specify length for the last piece in case it is zero-padded
              getOpts.length = this.pieceLength;
              if (p === this._file.pieceCount - 1) {
                getOpts.length = this._file.lastPieceLength;
              }

              this.getWsBuffer(p, getOpts, (err, buffer) => {
                this._notifying = false;
                if (this.destroyed) return;
                debug(
                  "read %s (length %s) (err %s)",
                  p,
                  buffer && buffer.length,
                  err && err.message
                );

                if (err) return this.destroy(err);

                if (this._offset) {
                  buffer = buffer.slice(this._offset);
                  this._offset = 0;
                }

                if (this._missing < buffer.length) {
                  buffer = buffer.slice(0, this._missing);
                }
                this._missing -= buffer.length;

                debug("pushing buffer of length %s", buffer.length);
                this._reading = false;
                this.push(buffer);

                if (this._missing === 0) this.push(null);
              });
              this._piece += 1;
            }

            getWsBuffer(p, getOpts, cb) {
              if (this._file.readFileBuffer) {
                this._file
                  .readFileBuffer(p * this.pieceLength, p * this.pieceLength + getOpts.length - 1)
                  .then((buffer) => {
                    cb(null, new Uint8Array(buffer));
                  });
              } else {
                const buffer = this._file.buffer.slice(
                  p * this.pieceLength,
                  p * this.pieceLength + getOpts.length
                );
                cb(null, new Uint8Array(buffer));
              }
            }

            _destroy(err, cb) {
              // if (!this._torrent.destroyed) {
              //   this._torrent.deselect(this._startPiece, this._endPiece, true)
              // }
              cb(err);
            }
          }

          module.exports = FileStream;
        },
        { debug: 9, "end-of-stream": 11, stream: 53 },
      ],
      65: [
        function (require, module, exports) {
          const EventEmitter = require("events");
          const { PassThrough } = require("stream");
          const path = require("path");
          const render = require("render-media");
          const streamToBlob = require("stream-to-blob");
          const streamToBlobURL = require("stream-to-blob-url");
          const streamToBuffer = require("stream-with-known-length-to-buffer");
          const queueMicrotask = require("queue-microtask");
          const rangeParser = require("range-parser");
          const mime = require("mime");
          const eos = require("end-of-stream");
          const FileStream = require("./file-stream.js");

          class File extends EventEmitter {
            constructor(file, buffer, readFileBuffer) {
              super();

              const Length = 16384 * 16 * 16;

              this.name = file.name;
              this.length = file.size;
              this.offset = 0;
              this.pieceLength = Length;
              const ceil = Math.ceil(file.size / Length);
              const floor = Math.floor(file.size / Length);
              this.pieceCount = ceil;
              this.lastPieceLength = file.size - Length * floor;
              this.buffer = buffer;
              this.readFileBuffer = readFileBuffer;
            }

            createReadStream(opts) {
              const fileStream = new FileStream(this, opts);
              return fileStream;
            }

            renderTo(elem, opts, cb) {
              if (typeof window === "undefined")
                throw new Error("browser-only method");
              render.render(this, elem, opts, cb);
            }
          }

          const WSFile = {
            File,
          };

          module.exports = WSFile;
        },
        {
          "./file-stream.js": 64,
          "end-of-stream": 11,
          events: 12,
          mime: 18,
          path: 29,
          "queue-microtask": 32,
          "range-parser": 33,
          "render-media": 50,
          stream: 53,
          "stream-to-blob": 55,
          "stream-to-blob-url": 54,
          "stream-with-known-length-to-buffer": 56,
        },
      ],
    },
    {},
    [65]
  )(65);
});
