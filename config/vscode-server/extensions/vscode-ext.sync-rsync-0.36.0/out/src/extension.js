'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode_1 = require("vscode");
const debounce = require("lodash.debounce");
const Rsync = require("rsync");
const chokidar = require("chokidar");
const Config_1 = require("./Config");
const child = require("child_process");
const fs_1 = require("fs");
const util = require("util");
//Shim for older VSCode
require("util.promisify").shim();
const path_exists = util.promisify(fs_1.exists);
const outputChannel = vscode_1.window.createOutputChannel('Sync-Rsync');
const statusBar = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Right, 1);
const createStatusText = (text) => `Rsync: ${text}`;
const getConfig = () => new Config_1.Config(vscode_1.workspace.getConfiguration('sync-rsync'));
let currentSync = undefined;
let syncKilled = true;
const execute = function (config, cmd, args = [], shell = undefined) {
    return new Promise(resolve => {
        let error = false;
        outputChannel.appendLine(`> ${cmd} ${args.join(" ")} `);
        if (config.autoShowOutput) {
            outputChannel.show();
        }
        let showOutput = (data) => {
            outputChannel.append(data.toString());
        };
        if (process.platform === 'win32' && shell) {
            // when the platform is win32, spawn would add /s /c flags, making it impossible for the 
            // shell to be something other than cmd or powershell (e.g. bash)
            args = ["'", cmd].concat(args, "'");
            currentSync = child.spawn(shell + " -c", args, { stdio: 'pipe', shell: "cmd.exe" });
        }
        else if (process.platform === 'win32' && config.useWSL) {
            args = [cmd].concat(args);
            currentSync = child.spawn("wsl", args, { stdio: 'pipe', shell: "cmd.exe" });
        }
        else {
            currentSync = child.spawn(cmd, args, { stdio: 'pipe', shell: shell });
        }
        currentSync.on('error', function (err) {
            outputChannel.append("ERROR > " + err.message);
            error = true;
            resolve(1);
        });
        currentSync.stdout.on('data', showOutput);
        currentSync.stderr.on('data', showOutput);
        currentSync.on('close', function (code) {
            if (error)
                return;
            if (code != 0) {
                resolve(code);
            }
            resolve(0);
        });
    });
};
const runSync = function (rsync, paths, site, config) {
    const syncStartTime = new Date();
    const isDryRun = rsync.isSet('n');
    outputChannel.appendLine(`\n${syncStartTime.toString()} ${isDryRun ? 'comparing' : 'syncing'}`);
    return execute(config, site.executable, rsync.args().concat(site.args).concat(paths), site.executableShell);
};
const runCommand = function (site, config, command) {
    let _command = command[0];
    let args = command.slice(1);
    return execute(config, _command, args, site.executableShell);
};
const syncSite = function (site, config, { down, dry }) {
    return __awaiter(this, void 0, void 0, function* () {
        if (down && site.upOnly) {
            outputChannel.appendLine(`\n${site.remotePath} is upOnly`);
            return true;
        }
        if (!down && site.downOnly) {
            outputChannel.appendLine(`\n${site.remotePath} is downOnly`);
            return true;
        }
        let paths = [];
        if (syncKilled)
            return false;
        ;
        if (site.localPath === null) {
            vscode_1.window.showErrorMessage('Sync-Rsync: you must have a folder open or configured local');
            return false;
        }
        if (site.remotePath === null) {
            vscode_1.window.showErrorMessage('Sync-Rsync: you must configure a remote');
            return false;
        }
        let rsync = new Rsync();
        if (down) {
            paths = [site.remotePath, site.localPath];
        }
        else {
            paths = [site.localPath, site.remotePath];
        }
        if (dry) {
            rsync = rsync.dry();
        }
        for (let option of site.options) {
            rsync.set.apply(rsync, option);
        }
        rsync = rsync
            .flags(site.flags)
            .progress(config.showProgress);
        if (site.include.length > 0) {
            rsync = rsync.include(site.include);
        }
        if (site.exclude.length > 0) {
            rsync = rsync.exclude(site.exclude);
        }
        if (site.shell !== undefined) {
            rsync = rsync.shell(site.shell);
        }
        if (site.deleteFiles) {
            rsync = rsync.delete();
        }
        if (site.chmod !== undefined) {
            rsync = rsync.chmod(site.chmod);
        }
        const runPrePost = function (site, config, command, tag) {
            return __awaiter(this, void 0, void 0, function* () {
                let rtn = yield runCommand(site, config, command);
                if (rtn != 0) {
                    vscode_1.window.showErrorMessage(tag + " return " + rtn);
                }
                return rtn;
            });
        };
        let rtn = 0;
        if (down) {
            if (site.preSyncDown)
                rtn = yield runPrePost(site, config, site.preSyncDown, "preSyncDown");
        }
        else {
            if (site.preSyncUp)
                rtn = yield runPrePost(site, config, site.preSyncUp, "preSyncUp");
        }
        rtn = yield runSync(rsync, paths, site, config);
        if (rtn == 0) {
            if (down) {
                if (site.postSyncDown)
                    rtn = yield runPrePost(site, config, site.postSyncDown, "postSyncDown");
            }
            else {
                if (site.postSyncUp)
                    rtn = yield runPrePost(site, config, site.postSyncUp, "postSyncUp");
                if (site.afterSync) {
                    rtn = yield runPrePost(site, config, site.afterSync, "afterSync");
                    vscode_1.window.showInformationMessage("afterSync will be deprecated use postSyncUp");
                }
            }
            return true;
        }
        else {
            vscode_1.window.showErrorMessage("rsync return " + rtn);
            return false;
        }
    });
};
const sync = function (config, { down, dry }) {
    return __awaiter(this, void 0, void 0, function* () {
        statusBar.color = 'mediumseagreen';
        statusBar.text = createStatusText('$(sync)');
        let success = true;
        syncKilled = false;
        statusBar.command = 'sync-rsync.killSync';
        for (let site of config.sites) {
            success = success && (yield syncSite(site, config, { down, dry }));
        }
        syncKilled = true;
        statusBar.command = 'sync-rsync.showOutput';
        if (success) {
            if (config.autoHideOutput) {
                outputChannel.hide();
            }
            statusBar.color = undefined;
            statusBar.text = createStatusText('$(check)');
            if (config.notification) {
                vscode_1.window.showInformationMessage("Sync Completed");
            }
        }
        else {
            if (config.autoShowOutputOnError) {
                outputChannel.show();
            }
            statusBar.color = 'red';
            statusBar.text = createStatusText('$(alert)');
        }
    });
};
const syncFile = function (config, file, down) {
    return __awaiter(this, void 0, void 0, function* () {
        statusBar.color = 'mediumseagreen';
        statusBar.text = createStatusText('$(sync)');
        let success = true;
        syncKilled = false;
        statusBar.command = 'sync-rsync.killSync';
        let sync_file = false;
        for (let site of config.sites) {
            let paths = [];
            if (syncKilled)
                continue;
            if (site.localPath === null) {
                vscode_1.window.showErrorMessage('Sync-Rsync: you must have a folder open or configured local');
                continue;
            }
            if (site.remotePath === null) {
                vscode_1.window.showErrorMessage('Sync-Rsync: you must configure a remote');
                continue;
            }
            let path = site.localPath;
            file = config.translatePath(file);
            if (file.startsWith(path)) {
                sync_file = true;
                let path_l = path.length;
                let post = file.slice(path_l);
                let local = path + post;
                let remote = site.remotePath + post;
                let rsync = new Rsync();
                let paths = down ? [remote, local] : [local, remote];
                for (let option of site.options) {
                    rsync.set.apply(rsync, option);
                }
                rsync = rsync
                    .flags(site.flags)
                    .progress(config.showProgress);
                if (site.include.length > 0) {
                    rsync = rsync.include(site.include);
                }
                if (site.exclude.length > 0) {
                    rsync = rsync.exclude(site.exclude);
                }
                if (site.shell !== undefined) {
                    rsync = rsync.shell(site.shell);
                }
                if (site.deleteFiles) {
                    rsync = rsync.delete();
                }
                if (site.chmod !== undefined) {
                    rsync = rsync.chmod(site.chmod);
                }
                let rtn = yield runSync(rsync, paths, site, config);
                //We can safly ignore error 3 because it might be excluded.
                if ((rtn == 0) || (rtn == 3)) {
                    success = success && true;
                }
                else {
                    vscode_1.window.showErrorMessage("rsync return " + rtn);
                    success = false;
                }
            }
        }
        syncKilled = true;
        statusBar.command = 'sync-rsync.showOutput';
        if (sync_file) {
            if (success) {
                if (config.autoHideOutput) {
                    outputChannel.hide();
                }
                statusBar.color = undefined;
                statusBar.text = createStatusText('$(check)');
                if (config.notification) {
                    vscode_1.window.showInformationMessage("Synced " + file);
                }
            }
            else {
                if (config.autoShowOutputOnError) {
                    outputChannel.show();
                }
                statusBar.color = 'red';
                statusBar.text = createStatusText('$(alert)');
            }
        }
    });
};
const syncUp = (config) => sync(config, { down: false, dry: false });
const syncDown = (config) => sync(config, { down: true, dry: false });
const compareUp = (config) => sync(config, { down: false, dry: true });
const compareDown = (config) => sync(config, { down: true, dry: true });
const debouncedSyncUp = debounce(syncUp, 100); // debounce 100ms in case of 'Save All'
const watch = (config) => {
    if (config.watchGlobs.length === 0) {
        return null;
    }
    outputChannel.appendLine(`Activating watcher on globs: ${config.watchGlobs.join(', ')}`);
    try {
        const watcher = chokidar.watch(config.watchGlobs, {
            cwd: vscode_1.workspace.rootPath,
            ignoreInitial: true
        });
        watcher.on('all', () => {
            debouncedSyncUp(config);
        });
        return watcher;
    }
    catch (error) {
        outputChannel.appendLine(`Unable to create watcher: ${error}`);
    }
    return null;
};
const syncSingle = function (config, down) {
    syncKilled = false;
    var site_map = config.siteMap;
    var keys = [...site_map.keys()];
    vscode_1.window.showQuickPick(keys)
        .then((k) => __awaiter(this, void 0, void 0, function* () {
        if (undefined == k)
            return true;
        var site = config.siteMap.get(k);
        if (undefined == site)
            return true;
        statusBar.color = 'mediumseagreen';
        statusBar.text = createStatusText('$(sync)');
        let success = true;
        syncKilled = false;
        statusBar.command = 'sync-rsync.killSync';
        success = yield syncSite(site, config, { down, dry: false });
        syncKilled = true;
        statusBar.command = 'sync-rsync.showOutput';
        if (success) {
            if (config.autoHideOutput) {
                outputChannel.hide();
            }
            statusBar.color = undefined;
            statusBar.text = createStatusText('$(check)');
            if (config.notification) {
                vscode_1.window.showInformationMessage("Sync Completed");
            }
        }
        else {
            if (config.autoShowOutputOnError) {
                outputChannel.show();
            }
            statusBar.color = 'red';
            statusBar.text = createStatusText('$(alert)');
        }
        return true;
    }));
};
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    let config = getConfig();
    let watcher = null;
    vscode_1.workspace.onDidChangeConfiguration(() => {
        config = getConfig();
        if (watcher) {
            outputChannel.appendLine('Closing watcher');
            watcher.close();
        }
        watcher = watch(config);
    });
    vscode_1.workspace.onDidSaveTextDocument((doc) => {
        if (config.onFileSave) {
            debouncedSyncUp(config);
        }
        else if (config.onFileSaveIndividual) {
            syncFile(config, config.translatePath(doc.fileName), false);
        }
    });
    vscode_1.workspace.onDidOpenTextDocument((doc) => {
        if (config.onFileLoadIndividual && doc.uri.scheme == 'file') {
            syncFile(config, config.translatePath(doc.fileName), true);
        }
    });
    const syncDownCommand = vscode_1.commands.registerCommand('sync-rsync.syncDown', () => {
        syncDown(config);
    });
    const syncDownContextCommand = vscode_1.commands.registerCommand('sync-rsync.syncDownContext', (i) => {
        fs_1.lstat(i.path, (err, info) => {
            if (err)
                return;
            var path = config.translatePath(i.path);
            if (info.isDirectory()) {
                if (path[path.length - 1] != '/')
                    path += '/';
            }
            syncFile(config, path, true);
        });
    });
    const syncDownSingleCommand = vscode_1.commands.registerCommand('sync-rsync.syncDownSingle', (site) => {
        syncSingle(config, true);
    });
    const syncUpCommand = vscode_1.commands.registerCommand('sync-rsync.syncUp', () => {
        syncUp(config);
    });
    const syncUpContextCommand = vscode_1.commands.registerCommand('sync-rsync.syncUpContext', (i) => {
        fs_1.lstat(i.path, (err, info) => {
            if (err)
                return;
            var path = config.translatePath(i.path);
            if (info.isDirectory()) {
                if (path[path.length - 1] != '/')
                    path += '/';
            }
            syncFile(config, path, false);
        });
    });
    const syncUpSingleCommand = vscode_1.commands.registerCommand('sync-rsync.syncUpSingle', (site) => {
        syncSingle(config, false);
    });
    const compareDownCommand = vscode_1.commands.registerCommand('sync-rsync.compareDown', () => {
        compareDown(config);
    });
    const compareUpCommand = vscode_1.commands.registerCommand('sync-rsync.compareUp', () => {
        compareUp(config);
    });
    const showOutputCommand = vscode_1.commands.registerCommand('sync-rsync.showOutput', () => {
        outputChannel.show();
    });
    const killSyncCommand = vscode_1.commands.registerCommand('sync-rsync.killSync', () => {
        syncKilled = true;
        currentSync.kill();
    });
    context.subscriptions.push(syncDownCommand);
    context.subscriptions.push(syncDownContextCommand);
    context.subscriptions.push(syncDownSingleCommand);
    context.subscriptions.push(syncUpCommand);
    context.subscriptions.push(syncUpContextCommand);
    context.subscriptions.push(syncUpSingleCommand);
    context.subscriptions.push(compareDownCommand);
    context.subscriptions.push(compareUpCommand);
    context.subscriptions.push(showOutputCommand);
    context.subscriptions.push(killSyncCommand);
    statusBar.text = createStatusText('$(info)');
    statusBar.command = 'sync-rsync.showOutput';
    statusBar.show();
    outputChannel.appendLine('Sync-Rsync started');
    watcher = watch(config);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map