"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const child_process_1 = require("child_process");
class AutoTag {
    getVersionNewBuild() {
        return Object.assign({}, this._currentVersion, { build: this._currentVersion.build + 1 });
    }
    getVersionNewMaintenance() {
        return Object.assign({}, this._currentVersion, { maintenance: this._currentVersion.maintenance + 1, build: 0 });
    }
    getVersionNewMinor() {
        return Object.assign({}, this._currentVersion, { minor: this._currentVersion.minor + 1, maintenance: 0, build: 0 });
    }
    getVersionNewMajor() {
        return Object.assign({}, this._currentVersion, { major: this._currentVersion.major + 1, minor: 0, maintenance: 0, build: 0 });
    }
    executeProcess() {
        /*   if (1 + 1 === 2) {
            const addFileResult: string = execSync(`git add .`, { encoding : 'utf8'});
            const commitResult: string = execSync(`git commit -m "files is been automatic commit in order to be tagged "`, { encoding : "utf8"});
            //console.log("Add Result--->", addFileResult, "\nCommit Result--->", commitResult);
        console.log(process.env.npm_config_argv,
           process.env.npm_config_message, process.env.npm_config_upgrade,
           process.env.npm_package_config_upgrade);
        return;
      }*/
        const upgrade = this.getArgumentUpgrade();
        const message = this.getArgument();
        this.handleArgError(upgrade);
        const tagListBashResult = child_process_1.execSync('git tag -l', { encoding: 'utf8' });
        const tagNames = tagListBashResult.split('\n').filter(tag => tag.match(/(^[0-9]*).([0-9]*).([0-9]*)-([0-9]*)/g));
        const orderedVersions = this.getOrderedVersions(tagNames, upgrade);
        if (tagNames.length > 0) {
            const version = orderedVersions[orderedVersions.length - 1];
            this._currentVersion = version;
            const nextBuild = this.getUpgradeKind(upgrade);
            const currentBranch = child_process_1.execSync('git symbolic-ref --short HEAD', { encoding: 'utf8' });
            const taggedResult = child_process_1.execSync(`git tag -a ${this.getNewVersionStr(nextBuild)} -m "${message}"`, { encoding: 'utf8' });
            const addFileResult = child_process_1.execSync(`git add .`, { encoding: 'utf8' });
            const commitResult = child_process_1.execSync(`git commit -m "files is been automatic commit in order to be tagged "`, { encoding: "utf8" });
            const pushedResult = child_process_1.execSync(`git push --tags`, { encoding: 'utf8' });
            this.writeNewVersionIntoPackageJson(nextBuild);
            const newTaggedResult = child_process_1.spawnSync('git', ['tag', '-l'], { encoding: 'utf8' });
            const logPretty = child_process_1.execSync(`git log --tags --pretty="Hash:%H %d message:%s"`, { encoding: 'utf8' });
            this.logResult([taggedResult, addFileResult, commitResult, pushedResult, newTaggedResult.stdout, logPretty]);
            fs_1.unlinkSync('autoTag.js');
        }
        /**/
    }
    mergeChaining(currentBranch) {
        return __awaiter(this, void 0, void 0, function* () {
            const cmdDevelop = `git checkout ${currentBranch}; git pull; git checkout develop; git merge ${currentBranch}`;
            const cmdMaster = `git checkout master; git pull; git merge develop`;
            const spawn = require('child_process').spawn;
            const child = spawn(`${cmdDevelop};`, {
                shell: true
            });
            child.stderr.on('data', (data) => {
                console.error('STDERR:', data.toString());
            });
            child.stdout.on('data', (data) => {
                console.log('STDOUT:', data.toString());
            });
            child.on('exit', (exitCode) => {
                console.log('Child exited with code: ' + exitCode);
            });
        });
    }
    logResult(logs) {
        for (const log of logs) {
            if (log.length > 0)
                console.log(`Process result--> ${log}\n`);
        }
    }
    getUpgradeKind(kind) {
        switch (kind) {
            case 'build':
                return this.getVersionNewBuild();
            case 'maintenance':
                return this.getVersionNewMaintenance();
            case 'minor':
                return this.getVersionNewMinor();
            case 'major':
                return this.getVersionNewMajor();
        }
    }
    handleArgError(upgrade) {
        if (!(upgrade === 'build') && !(upgrade === 'maintenance') && !(upgrade === 'minor') && !(upgrade === 'major')) {
            console.log("FEHLER-->", upgrade);
            throw new SyntaxError(`upgrade argument syntax error
                                example without arguments: npm run autoTag <-- automatic set the next tag build from 0.0.0-0 to 0.0.0-1,
                                example with arguments: npm run autoTag --upgrade="maintenance" <-- automatic  set the next tag maintenance from 0.0.0-14 to  0.0.1-0
                                example with arguments: npm run autoTag --upgrade="minor" <-- automatic  set the next tag minor from 0.0.2-14 to  0.1.0-0
                                example with arguments: npm run autoTag --upgrade="major" <-- automatic  set the next tag major from 0.1.2-14 to  1.0.0-0
                                 `);
        }
    }
    getArgument() {
        return JSON.parse(process.env.npm_config_argv).original.length === 4 ? process.env.npm_config_message : process.env.npm_package_config_message;
    }
    getArgumentUpgrade() {
        const isArgument = process.env.npm_config_upgrade !== undefined;
        console.log('Argument', process.env.npm_package_config_upgrade, process.env.npm_config_upgrade, process.env.npm_config_upgrade !== undefined);
        return isArgument ? process.env.npm_config_upgrade : "build";
    }
    getOrderedVersions(tagNames, upgrade) {
        const orderedVersions = tagNames.map((versionTag) => {
            versionTag.split('.');
            const split = versionTag.split('.');
            const trailer = split[split.length - 1].split('-');
            const version = {
                major: parseInt(split[0], 10),
                minor: parseInt(split[1], 10),
                maintenance: parseInt(trailer[0], 10),
                build: parseInt(trailer[1], 10)
            };
            return version;
        }).sort((ver1, ver2) => {
            switch (upgrade) {
                case 'build':
                    return ver1.major - ver2.major || ver1.minor - ver2.minor || ver1.maintenance - ver2.maintenance || ver1.build - ver2.build;
                case 'maintenance':
                    return ver1.major - ver2.major || ver1.minor - ver2.minor || ver1.maintenance - ver2.maintenance;
                case 'minor':
                    return ver1.major - ver2.major || ver1.minor - ver2.minor;
                case 'major':
                    return ver1.major - ver2.major;
            }
        });
        return orderedVersions;
    }
    writeNewVersionIntoPackageJson(version) {
        const theFile = JSON.parse(fs_1.readFileSync('package.json', { encoding: 'utf8' }));
        const newPackage = Object.assign({}, theFile, { version: this.getNewVersionStr(version) });
        fs_1.writeFileSync(`package.json`, JSON.stringify(newPackage, null, 2), { encoding: 'utf8', flag: 'w' });
    }
    getNewVersionStr(version) {
        return `${version.major}.${version.minor}.${version.maintenance}-${version.build}`;
    }
}
exports.AutoTag = AutoTag;
new AutoTag().executeProcess();
