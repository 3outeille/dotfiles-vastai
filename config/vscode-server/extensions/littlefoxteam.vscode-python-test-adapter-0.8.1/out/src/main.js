"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const tslib_1 = require("tslib");
const vscode = tslib_1.__importStar(require("vscode"));
const vscode_test_adapter_api_1 = require("vscode-test-adapter-api");
const configurationFactory_1 = require("./configuration/configurationFactory");
const idGenerator_1 = require("./idGenerator");
const defaultLogger_1 = require("./logging/defaultLogger");
const noopOutputChannel_1 = require("./logging/outputChannels/noopOutputChannel");
const vscodeOutputChannel_1 = require("./logging/outputChannels/vscodeOutputChannel");
const pytestTestRunner_1 = require("./pytest/pytestTestRunner");
const testplanTestRunner_1 = require("./testplan/testplanTestRunner");
const pythonTestAdapter_1 = require("./pythonTestAdapter");
const unittestTestRunner_1 = require("./unittest/unittestTestRunner");
function registerTestAdapters(wf, extension, loggerFactory) {
    const adapters = [
        createPythonTestAdapter('unittest', unittestTestRunner_1.UnittestTestRunner, wf, loggerFactory),
        createPythonTestAdapter('pytest', pytestTestRunner_1.PytestTestRunner, wf, loggerFactory),
        createPythonTestAdapter('testplan', testplanTestRunner_1.TestplanTestRunner, wf, loggerFactory),
    ];
    adapters.forEach((adapter) => extension.exports.registerTestAdapter(adapter));
    return adapters;
}
function configureLogging(context) {
    try {
        const channel = vscode.window.createOutputChannel('Python Test Adapter Log');
        context.subscriptions.push(channel);
        return (framework, wf) => {
            return new defaultLogger_1.DefaultLogger(new vscodeOutputChannel_1.VscodeOutputChannel(channel), wf, framework);
        };
    }
    catch (_a) {
        return (framework, wf) => {
            return new defaultLogger_1.DefaultLogger(new noopOutputChannel_1.NoopOutputChannel(), wf, framework);
        };
    }
}
function activate(context) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const testExplorerExtension = vscode.extensions.getExtension(vscode_test_adapter_api_1.testExplorerExtensionId);
        if (!testExplorerExtension) {
            return;
        }
        if (!testExplorerExtension.isActive) {
            yield testExplorerExtension.activate();
        }
        const loggerFactory = configureLogging(context);
        const registeredAdapters = new Map();
        if (vscode.workspace.workspaceFolders) {
            for (const workspaceFolder of vscode.workspace.workspaceFolders) {
                const adapters = registerTestAdapters(workspaceFolder, testExplorerExtension, loggerFactory);
                registeredAdapters.set(workspaceFolder, adapters);
            }
        }
        const workspaceFolderChangedSubscription = vscode.workspace.onDidChangeWorkspaceFolders((event) => {
            for (const workspaceFolder of event.removed) {
                const adapters = registeredAdapters.get(workspaceFolder);
                if (adapters) {
                    adapters.forEach((adapter) => {
                        testExplorerExtension.exports.unregisterTestAdapter(adapter);
                        adapter.dispose();
                    });
                    registeredAdapters.delete(workspaceFolder);
                }
            }
            for (const workspaceFolder of event.added) {
                const adapters = registerTestAdapters(workspaceFolder, testExplorerExtension, loggerFactory);
                registeredAdapters.set(workspaceFolder, adapters);
            }
        });
        context.subscriptions.push(workspaceFolderChangedSubscription);
    });
}
exports.activate = activate;
function createPythonTestAdapter(frameworkName, runnerClass, wf, loggerFactory) {
    const logger = loggerFactory(frameworkName, wf);
    const runner = new runnerClass((0, idGenerator_1.nextId)(), logger);
    const configurationFactory = new configurationFactory_1.DefaultConfigurationFactory(logger);
    return new pythonTestAdapter_1.PythonTestAdapter(frameworkName, wf, runner, configurationFactory, logger);
}
//# sourceMappingURL=main.js.map