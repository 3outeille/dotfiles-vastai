"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestplanTestRunner = void 0;
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
const tmp = tslib_1.__importStar(require("tmp"));
const argparse_1 = require("argparse");
const environmentVariablesLoader_1 = require("../environmentVariablesLoader");
const processRunner_1 = require("../processRunner");
const collections_1 = require("../utilities/collections");
const tests_1 = require("../utilities/tests");
const testplanJunitTestStatesParser_1 = require("./testplanJunitTestStatesParser");
const testplanTestCollectionParser_1 = require("./testplanTestCollectionParser");
const TESTPLAN_NON_ERROR_EXIT_CODES = [0, 1, 2];
class TestplanTestRunner {
    constructor(adapterId, logger) {
        this.adapterId = adapterId;
        this.logger = logger;
        this.testExecutions = new Map();
    }
    cancel() {
        this.testExecutions.forEach((execution, test) => {
            this.logger.log('info', `Cancelling execution of ${test}`);
            try {
                execution.cancel();
            }
            catch (error) {
                this.logger.log('crit', `Cancelling execution of ${test} failed: ${error}`);
            }
        });
    }
    debugConfiguration(config, test) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const additionalEnvironment = yield this.loadEnvironmentVariables(config);
            const runArguments = this.getRunArguments(test, config.getTestplanConfiguration().testplanArguments);
            return {
                program: config.getTestplanConfiguration().testplanPath(),
                cwd: config.getCwd(),
                args: runArguments.argumentsToPass,
                env: additionalEnvironment,
            };
        });
    }
    load(config) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!config.getTestplanConfiguration().isTestplanEnabled) {
                this.logger.log('info', 'TestPlan test discovery is disabled');
                return undefined;
            }
            const additionalEnvironment = yield this.loadEnvironmentVariables(config);
            this.logger.log('info', `Discovering tests using python path '${config.pythonPath()}' in ${config.getCwd()}`);
            const discoveryArguments = this.getDiscoveryArguments(config.getTestplanConfiguration().testplanArguments);
            this.logger.log('info', `Running testplan with arguments: ${discoveryArguments.join(', ')}`);
            const result = yield this.runTestPlan(config, additionalEnvironment, discoveryArguments).complete();
            const tests = (0, testplanTestCollectionParser_1.parseTestSuites)(result.output);
            if ((0, collections_1.empty)(tests)) {
                this.logger.log('warn', 'No tests discovered');
                return undefined;
            }
            (0, tests_1.setDescriptionForEqualLabels)(tests, path.sep);
            return {
                type: 'suite',
                id: this.adapterId,
                label: 'Testplan tests',
                children: tests,
            };
        });
    }
    run(config, test, outputCollector) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!config.getTestplanConfiguration().isTestplanEnabled) {
                this.logger.log('info', 'Testplan test execution is disabled');
                return [];
            }
            this.logger.log('info', `Running tests using python path '${config.pythonPath()}' in ${config.getCwd()}`);
            const additionalEnvironment = yield this.loadEnvironmentVariables(config);
            const runArguments = this.getRunArguments(test, config.getTestplanConfiguration().testplanArguments);
            const { dirName, cleanupCallback } = yield this.getJunitReportPath(config.getCwd(), runArguments);
            const testRunArguments = [`--xml=${dirName}`].concat(runArguments.argumentsToPass);
            this.logger.log('info', `Running testplan with arguments: ${testRunArguments.join(', ')}`);
            const testExecution = this.runTestPlan(config, additionalEnvironment, testRunArguments, outputCollector);
            this.testExecutions.set(test, testExecution);
            yield testExecution.complete();
            this.testExecutions.delete(test);
            this.logger.log('info', 'Test execution completed');
            const states = yield (0, testplanJunitTestStatesParser_1.parseTestStates)(dirName);
            cleanupCallback();
            return states;
        });
    }
    runTestPlan(config, env, args, outputCollector) {
        const testplanPath = config.getTestplanConfiguration().testplanPath();
        this.logger.log('info', `Running ${testplanPath} as an executable`);
        return (0, processRunner_1.runProcess)(config.pythonPath(), [testplanPath].concat(args), {
            cwd: config.getCwd(),
            environment: env,
            acceptedExitCodes: TESTPLAN_NON_ERROR_EXIT_CODES,
            outputCollector,
        });
    }
    loadEnvironmentVariables(config) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const envFileEnvironment = yield environmentVariablesLoader_1.EnvironmentVariablesLoader.load(config.envFile(), process.env, this.logger);
            const updatedPythonPath = [config.getCwd(), envFileEnvironment.PYTHONPATH, process.env.PYTHONPATH]
                .filter((item) => item)
                .join(path.delimiter);
            return Object.assign(Object.assign({}, envFileEnvironment), { PYTHONPATH: updatedPythonPath, TESTPLAN_PLUGINS: envFileEnvironment.TESTPLAN_PLUGINS });
        });
    }
    getJunitReportPath(cwd, runArguments) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (runArguments.junitReportPath) {
                return Promise.resolve({
                    dirName: path.resolve(cwd, runArguments.junitReportPath),
                    cleanupCallback: () => {
                    },
                });
            }
            return yield this.createTemporaryDirectory();
        });
    }
    getDiscoveryArguments(rawTestplanArguments) {
        const argumentParser = this.configureCommonArgumentParser();
        const [, argumentsToPass] = argumentParser.parse_known_args(rawTestplanArguments);
        return ['--info', 'pattern-full'].concat(argumentsToPass);
    }
    getRunArguments(test, rawTestplanArguments) {
        const argumentParser = this.configureCommonArgumentParser();
        const [knownArguments, argumentsToPass] = argumentParser.parse_known_args(rawTestplanArguments);
        return {
            junitReportPath: knownArguments.xmlpath,
            argumentsToPass: argumentsToPass.concat(test !== this.adapterId ? ['--patterns', test] : knownArguments.tests || []),
        };
    }
    configureCommonArgumentParser() {
        const argumentParser = new argparse_1.ArgumentParser({
            exit_on_error: false,
        });
        argumentParser.add_argument('--runpath', { action: 'store', dest: 'runpath' });
        argumentParser.add_argument('--stdout-style', { action: 'store', dest: 'stdout_style' });
        argumentParser.add_argument('--xml', { action: 'store', dest: 'xmlpath' });
        return argumentParser;
    }
    createTemporaryDirectory() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                tmp.dir((error, dirName, cleanupCallback) => {
                    if (error) {
                        reject(new Error(`Can not create temporary directory ${dirName}: ${error}`));
                    }
                    resolve({ dirName, cleanupCallback });
                });
            });
        });
    }
}
exports.TestplanTestRunner = TestplanTestRunner;
//# sourceMappingURL=testplanTestRunner.js.map