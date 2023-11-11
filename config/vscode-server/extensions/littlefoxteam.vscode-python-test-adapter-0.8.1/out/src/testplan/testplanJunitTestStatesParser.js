"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTestStates = void 0;
const tslib_1 = require("tslib");
const os_1 = require("os");
const path = tslib_1.__importStar(require("path"));
const xml2js = tslib_1.__importStar(require("xml2js"));
const collections_1 = require("../utilities/collections");
const fs_1 = require("../utilities/fs");
const strings_1 = require("../utilities/strings");
function parseTestStates(outputXmlDir) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const xmlDirContent = yield (0, fs_1.readDir)(outputXmlDir);
        let testResults = [];
        for (const xmlFile of xmlDirContent) {
            const content = yield (0, fs_1.readFile)(path.join(outputXmlDir, xmlFile));
            const parseResult = yield parseXml(content);
            testResults = testResults.concat(parseTestResults(parseResult));
        }
        return testResults;
    });
}
exports.parseTestStates = parseTestStates;
function parseXml(content) {
    return new Promise((resolve, reject) => {
        xml2js.parseString(content, (parseError, parserResult) => {
            if (parseError) {
                return reject(parseError);
            }
            resolve(parserResult);
        });
    });
}
function parseTestResults(parserResult) {
    if (!parserResult) {
        return [];
    }
    const testSuiteResults = parserResult.testsuites.testsuite;
    return testSuiteResults
        .map((testSuiteResult) => {
        if (!Array.isArray(testSuiteResult.testcase)) {
            return [];
        }
        return testSuiteResult.testcase
            .map((testcase) => mapToTestState(testcase))
            .filter((x) => x)
            .map((x) => x);
    })
        .reduce((r, x) => r.concat(x), []);
}
function mapToTestState(testcase) {
    const testId = testcase.$.classname;
    if (!testId) {
        return undefined;
    }
    const [state, output, message, time] = getTestState(testcase);
    return {
        state,
        test: testId,
        type: 'test',
        message: (0, strings_1.concatNonEmpty)(os_1.EOL + os_1.EOL, message, output),
        description: time ? `(${time}s)` : undefined,
    };
}
function getTestState(testcase) {
    const output = (0, strings_1.concatNonEmpty)(os_1.EOL, extractSystemOut(testcase), extractSystemErr(testcase));
    const executionTime = testcase.$.time;
    if (testcase.error) {
        return ['failed', output, extractErrorMessage(testcase.error), executionTime];
    }
    if (testcase.failure) {
        return ['failed', output, extractErrorMessage(testcase.failure), executionTime];
    }
    if (testcase.skipped) {
        return ['skipped', output, extractErrorMessage(testcase.skipped), executionTime];
    }
    return ['passed', '', output, executionTime];
}
function extractSystemOut(testcase) {
    return (0, collections_1.empty)(testcase['system-out']) ? '' : testcase['system-out'].join(os_1.EOL);
}
function extractSystemErr(testcase) {
    return (0, collections_1.empty)(testcase['system-err']) ? '' : testcase['system-err'].join(os_1.EOL);
}
function extractErrorMessage(errors) {
    if (!errors || !errors.length) {
        return '';
    }
    return (0, strings_1.concatNonEmpty)(os_1.EOL, ...errors.map((e) => (0, strings_1.concatNonEmpty)(os_1.EOL, e.$.message, e._)));
}
//# sourceMappingURL=testplanJunitTestStatesParser.js.map