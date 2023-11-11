"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.concatNonEmpty = exports.startsWith = void 0;
function startsWith(s, p, offset = 0) {
    return s.substring(offset).startsWith(p);
}
exports.startsWith = startsWith;
function concatNonEmpty(glue, ...s) {
    return s.filter((p) => p).join(glue);
}
exports.concatNonEmpty = concatNonEmpty;
//# sourceMappingURL=strings.js.map