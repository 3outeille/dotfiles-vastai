"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingOutputCollector = void 0;
class LoggingOutputCollector {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
    }
    attach(process) {
        var _a, _b;
        (_a = process.stderr) === null || _a === void 0 ? void 0 : _a.on('data', (chunk) => this.write(`${chunk}`));
        (_b = process.stdout) === null || _b === void 0 ? void 0 : _b.on('data', (chunk) => this.write(`${chunk}`));
    }
    write(message) {
        this.outputChannel.append(message);
    }
}
exports.LoggingOutputCollector = LoggingOutputCollector;
//# sourceMappingURL=loggingOutputCollector.js.map