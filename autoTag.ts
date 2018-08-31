import {readFileSync, unlinkSync, writeFileSync} from 'fs';
import {ChildProcess, execSync, spawnSync, SpawnSyncReturns} from 'child_process';


export class AutoTag {

  private _currentVersion: Version;

  public getVersionNewBuild(): Version {
    return {...this._currentVersion, build: this._currentVersion.build + 1};
  }

  public getVersionNewMaintenance(): Version {
    return {...this._currentVersion, maintenance: this._currentVersion.maintenance + 1, build: 0};
  }

  public getVersionNewMinor(): Version {
    return {...this._currentVersion, minor: this._currentVersion.minor + 1, maintenance: 0, build: 0};
  }

  public getVersionNewMajor(): Version {
    return {...this._currentVersion, major: this._currentVersion.major + 1, minor: 0, maintenance: 0, build: 0};
  }

  public executeProcess(): void {


    // if (1 + 1 === 2) {

    console.log(process.env.npm_config_argv,
      process.env.npm_config_message, process.env.npm_config_upgrade,
      process.env.npm_package_config_upgrade);
    //const upgrade2: string = this.getArgumentUpgrade();
    //return;
    //}


    const upgrade: string = this.getArgumentUpgrade();
    const message: string = this.getArgument();
    this.handleArgError(upgrade);

    const tagListBashResult: string = execSync('git tag -l', {encoding: 'utf8'});
    const tagNames: string[] = tagListBashResult.split('\n').filter(tag => tag.match(/(^[0-9]*).([0-9]*).([0-9]*)-([0-9]*)/g));
    const orderedVersions: Version[] = this.getOrderedVersions(tagNames, upgrade);

    if (tagNames.length > 0) {
      const version: Version = orderedVersions[orderedVersions.length - 1];
      this._currentVersion = version;
      const nextBuild: Version = this.getUpgradeKind(upgrade);
      const currentBranch: string = execSync('git symbolic-ref --short HEAD', {encoding: 'utf8'});
      const taggedResult: string = execSync(`git tag -a ${this.getNewVersionStr(nextBuild)} -m "${message}"`, {encoding: 'utf8'});
      const pushedResult: string = execSync(`git push --tags`, {encoding: 'utf8'});
      this.writeNewVersionIntoPackageJson(nextBuild);
      const newTaggedResult: SpawnSyncReturns<string> = spawnSync('git', ['tag', '-l'], {encoding: 'utf8'});

      this.logResult([taggedResult, pushedResult, newTaggedResult.stdout]);
      unlinkSync('autoTag.js');


    }
    /**/

  }

  private async mergeChaining(currentBranch: string): Promise<void> {

    const cmdDevelop: string = `git checkout ${currentBranch}; git pull; git checkout develop; git merge ${currentBranch}`;
    const cmdMaster: string = `git checkout master; git pull; git merge develop`;
    const spawn = require('child_process').spawn;
    const child: ChildProcess = spawn(`${cmdDevelop};`, {
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

  }

  private logResult(logs: string[]): void {
    for (const log of logs) {
      if (log.length > 0)
        console.log(`Process result--> ${log}\n`);
    }
  }

  private getUpgradeKind(kind: string): Version {

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

  private handleArgError(upgrade: string): void {
    if (!(upgrade === 'build') && !(upgrade === 'maintenance') && !(upgrade === 'minor') && !(upgrade === 'major')) {
      console.log("FEHLER-->", upgrade);
      throw  new SyntaxError(`upgrade argument syntax error
                                example without arguments: npm run autoTag <-- automatic set the next tag build from 0.0.0-0 to 0.0.0-1,
                                example with arguments: npm run autoTag --upgrade="maintenance" <-- automatic  set the next tag maintenance from 0.0.0-14 to  0.0.1-0
                                example with arguments: npm run autoTag --upgrade="minor" <-- automatic  set the next tag minor from 0.0.2-14 to  0.1.0-0
                                example with arguments: npm run autoTag --upgrade="major" <-- automatic  set the next tag major from 0.1.2-14 to  1.0.0-0
                                 `);
    }
  }

  private getArgument(): string {
    return JSON.parse(process.env.npm_config_argv).original.length === 4 ? process.env.npm_config_message : process.env.npm_package_config_message;
  }

  private getArgumentUpgrade(): string {
    const isArgument: boolean = process.env.npm_config_upgrade !== undefined;
    console.log('Argument', process.env.npm_package_config_upgrade, process.env.npm_config_upgrade, process.env.npm_config_upgrade !== undefined);
    return isArgument  ? process.env.npm_config_upgrade : "build";
  }

  private getOrderedVersions(tagNames: string[], upgrade: string): Version[] {
    const orderedVersions: Version[] = tagNames.map((versionTag: string) => {
      versionTag.split('.');
      const split: string[] = versionTag.split('.');
      const trailer: string[] = split[split.length - 1].split('-');
      const version: Version = {
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
      }
    );
    return orderedVersions;
  }

  private writeNewVersionIntoPackageJson(version: Version): void {
    const theFile: any = JSON.parse(readFileSync('package.json', {encoding: 'utf8'}));
    const newPackage: any = {...theFile, version: this.getNewVersionStr(version)};
    writeFileSync(`package.json`, JSON.stringify(newPackage, null, 2), {encoding: 'utf8', flag: 'w'});
  }

  private getNewVersionStr(version: Version): string {
    return `${version.major}.${version.minor}.${version.maintenance}-${version.build}`;
  }


}

interface Version {
  major: number;
  minor: number;
  maintenance: number;
  build: number;
}

new AutoTag().executeProcess();
