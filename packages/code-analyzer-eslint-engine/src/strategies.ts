import {ESLint, Linter, Rule} from "eslint";
import path from "node:path";
import {ESLintRuleStatus} from "./enums";
import process from "node:process";
import {getMessage} from "./messages";
import fs from "node:fs";

export interface ESLintStrategy {
    getMetadataFor(ruleName: string): Rule.RuleMetaData

    calculateRuleStatuses(filesToScan?: string[]): Promise<Map<string, ESLintRuleStatus>>

    run(ruleNames: string[], filesAndFoldersToScan: string[]): Promise<ESLint.LintResult[]>
}

export class LegacyESLintStrategy implements ESLintStrategy{
    private readonly userEslintConfigFile?: string;
    private readonly disableJavascriptBaseConfig: boolean;
    private readonly disableTypescriptBaseConfig: boolean;
    private readonly disableLwcBaseConfig: boolean;

    private allRulesMetadataCache?: Map<string, Rule.RuleMetaData>;
    private ruleStatusesCache?: Map<string, ESLintRuleStatus>;

    constructor(userEslintConfigFile?: string, disableJavascriptBaseConfig:boolean = false, disableTypescriptBaseConfig: boolean = false, disableLwcBaseConfig: boolean = false) {
        this.userEslintConfigFile = userEslintConfigFile;
        this.disableJavascriptBaseConfig = disableJavascriptBaseConfig;
        this.disableTypescriptBaseConfig = disableTypescriptBaseConfig;
        this.disableLwcBaseConfig = disableLwcBaseConfig;
    }

    getMetadataFor(ruleName: string): Rule.RuleMetaData {
        return this.getAllRulesMetadata().get(ruleName) as Rule.RuleMetaData;
    }

    /**
     * Returns the metadata for all rules (from all plugins available) that contain metadata.
     * Note that during this step, we do not reduce down the list of rules based on what the user has selected in their
     * configuration files or what we have selected in our base config. This method returns all the rules so that users
     * can use code analyzer to further categorize the rules (via code analyzer config) and select them if they wish.
     */
    private getAllRulesMetadata(): Map<string, Rule.RuleMetaData> {
        if (this.allRulesMetadataCache) {
            return this.allRulesMetadataCache;
        }

        const legacyESLint: ESLint = this.createLegacyESLint(this.createLegacyBaseConfig('all'));
        const ruleModulesMap: Map<string, Rule.RuleModule> = this.getAllRuleModules(legacyESLint);
        const allRulesMetadata: Map<string, Rule.RuleMetaData> = new Map();
        for (const [ruleName, ruleModule] of ruleModulesMap) {
            if (ruleModule.meta && !ruleModule.meta.deprecated) { // do not add deprecated rules or rules without metadata
                allRulesMetadata.set(ruleName, ruleModule.meta);
            }
        }
        this.allRulesMetadataCache = allRulesMetadata;
        return allRulesMetadata;
    }

    private getAllRuleModules(legacyESLint: ESLint): Map<string, Rule.RuleModule> {
        // See https://github.com/eslint/eslint/discussions/18546 to see how we arrived at this implementation.
        const legacyESLintModule: string = path.resolve(path.dirname(require.resolve('eslint')),'eslint','eslint.js');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(legacyESLintModule).getESLintPrivateMembers(legacyESLint).cliEngine.getRules();
    }

    /**
     * Calculates the rule status over all the provided files and resolve the statuses across the different configurations
     * Since a rule status can differ for different files, we choose for the rule the status of:
     *     - "error" if any file marks the rule with "error"
     *     - otherwise "warn" if any file marks the rule with "warn"
     *     - otherwise "off" (which means it is off for all files)
     */
    async calculateRuleStatuses(filesToScan?: string[]): Promise<Map<string, ESLintRuleStatus>> {
        if (!filesToScan) {
            if (this.ruleStatusesCache) {
                return this.ruleStatusesCache;
            }
            filesToScan = this.getSampleFilesForRuleStatusCalculation();
        }

        const ruleStatusForAll: Map<string, ESLintRuleStatus> = await this.calculateRuleStatusesFor(filesToScan,
            this.createLegacyESLint(this.createLegacyBaseConfig('all')));

        const ruleStatusForRecommended: Map<string, ESLintRuleStatus> = await this.calculateRuleStatusesFor(filesToScan,
            this.createLegacyESLint(this.createLegacyBaseConfig('recommended')));

        for (const ruleInAll of ruleStatusForAll.keys()) {
            if (!ruleStatusForRecommended.has(ruleInAll)) {
                ruleStatusForRecommended.set(ruleInAll, ESLintRuleStatus.OFF);
            }
        }

        this.ruleStatusesCache = ruleStatusForRecommended;
        return ruleStatusForRecommended;
    }

    private async calculateRuleStatusesFor(filesToScan: string[], legacyESLint: ESLint): Promise<Map<string, ESLintRuleStatus>> {
        const configs = await Promise.all(filesToScan.map(f => legacyESLint.calculateConfigForFile(f)));
        const ruleStatuses: Map<string, ESLintRuleStatus> = new Map();
        for (const config of configs) {
            for (const ruleName of Object.keys(config["rules"])) {
                const newStatus: ESLintRuleStatus = config["rules"][ruleName][0];
                if (!ruleStatuses.has(ruleName)) {
                    ruleStatuses.set(ruleName, newStatus);
                    continue;
                }
                const existingStatus: ESLintRuleStatus = ruleStatuses.get(ruleName) as ESLintRuleStatus;
                if (existingStatus === ESLintRuleStatus.ERROR || newStatus == ESLintRuleStatus.ERROR) {
                    ruleStatuses.set(ruleName, ESLintRuleStatus.ERROR);
                } else if (existingStatus === ESLintRuleStatus.WARN || newStatus === ESLintRuleStatus.WARN) {
                    ruleStatuses.set(ruleName, ESLintRuleStatus.WARN);
                } else {
                    ruleStatuses.set(ruleName, ESLintRuleStatus.OFF);
                }
            }
        }
        this.ruleStatusesCache = ruleStatuses;
        return ruleStatuses;
    }

    async run(ruleNames: string[], filesAndFoldersToScan: string[]): Promise<ESLint.LintResult[]> {
        const eslintForScanning: ESLint = this.createLegacyESLint(this.createLegacyBaseConfig('all'),
            await this.calculateSelectedRulesConfig(ruleNames))

        //TEMPORARY:
        // console.log(JSON.stringify({
        //     baseConfig: this.createLegacyBaseConfig('all'),
        //     overrideConfigFile: this.userEslintConfigFile,
        //     overrideConfig: await this.calculateSelectedRulesConfig(ruleNames)
        // },null,2));
        // console.log('.....')
        // console.log(await eslintForScanning.calculateConfigForFile('/Users/stephen.carter/github/forcedotcom/sfdx-scanner/src/CsvOutputFormatter.ts'))
        // console.log('.....')

        try {
            return await eslintForScanning.lintFiles(filesAndFoldersToScan);
        } catch(err) {
            const errMsg: string = (err as Error).message;
            throw new Error(getMessage('ErrorRunningEslintLintFiles', errMsg), {cause: err});
        }
    }

    private async calculateSelectedRulesConfig(rulesThatShouldBeOn: string[]): Promise<Linter.Config> {
        const setOfRulesThatShouldBeOn: Set<string> = new Set(rulesThatShouldBeOn);
        const rulesThatAreCurrentlyOn: string[] = Array.from((await this.calculateRuleStatuses()).keys());
        const rulesToTurnOff: string[] = rulesThatAreCurrentlyOn.filter(ruleName => !setOfRulesThatShouldBeOn.has(ruleName));

        const rulesRecord: Linter.RulesRecord = {};
        for (const ruleToTurnOff of rulesToTurnOff) {
            rulesRecord[ruleToTurnOff] = [ESLintRuleStatus.OFF]
        }
        return {
            rules: rulesRecord
        };
    }

    private createLegacyESLint(baseConfig: Linter.Config, overrideConfig?: Linter.Config): ESLint {
        return new ESLint({
            cwd: __dirname,
            errorOnUnmatchedPattern: false,
            // This is applied first (on bottom)
            baseConfig: baseConfig,
            // This is applied second
            overrideConfigFile: this.userEslintConfigFile,
            // This is applied third (on top)
            overrideConfig: overrideConfig
        });
    }

    private createLegacyBaseConfig(allOrRecommended: string): Linter.Config {
        const baseJavascriptRules: string[] = this.disableJavascriptBaseConfig ? [] : [`eslint:${allOrRecommended}`];

        const overrides: Linter.ConfigOverride[] = [];
        if (this.disableLwcBaseConfig) {
            overrides.push({
                files: ["*.js", "*.mjs", "*.cjs"],
                extends: [...baseJavascriptRules]
            });
        } else {
            overrides.push({
                files: ["*.js", "*.mjs", "*.cjs"],
                extends: [
                    ...baseJavascriptRules,
                    "@salesforce/eslint-config-lwc/base"
                ],
                plugins: [
                    "@lwc/eslint-plugin-lwc"
                ],
                parser: "@babel/eslint-parser",
                parserOptions: {
                    requireConfigFile: false,
                    babelOptions: {
                        parserOpts: {
                            plugins: [
                                "classProperties",
                                ["decorators", { "decoratorsBeforeExport": false }]
                            ]
                        }
                    }
                }
            });
        }
        if (!this.disableTypescriptBaseConfig) {
            overrides.push({
                files: ["*.ts"],
                extends: [
                    `eslint:${allOrRecommended}`,
                    `plugin:@typescript-eslint/${allOrRecommended}`,
                ],
                plugins: [
                    "@typescript-eslint"
                ],
                parser: '@typescript-eslint/parser',
                parserOptions: {
                    project: true
                }
            });
        }

        return {
            globals: {
                "$A": "readonly",  // Mark as known global for Aura: https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/ref_jsapi_dollarA.htm
            },
            overrides: overrides
        };
    }

    private getSampleFilesForRuleStatusCalculation(): string[] {
        // To get the user selected status ("error", "warn" , or "off") of every single rule, we would theoretically have to
        // ask eslint to calculate the configuration (which contains the rule status) for every single file that will be
        // scanned. This is because users can add to their config that they only want certain rules to run for a particular
        // file deep in their project. This is why ESLint only offers a calculateConfigForFile(filePath) method and not a
        // getConfig method. See https://eslint.org/docs/v8.x/integrate/nodejs-api#-eslintcalculateconfigforfilefilepath
        // If we were to do a full analysis using all the workspace files, it would be rather expensive. Instead, we will
        // just use a list of sample dummy files instead to keep things fast. Note that the calculateConfigForFile method
        // doesn't need the file to actually exist, so we just generate some sample file names for the various types of
        // files that we expect eslint to scan.
        // With this shortcut, the worse case scenario is that we miss that a rule has been turned on for some particular
        // file (thus we would miss adding in the 'Recommended' tag for that rule). But in that case, the user can still
        // update their code analyzer config file to manually add in the 'Recommended' tag for these special cases.
        // Alternatively if users complain, then in the future we can add to the eslint engine a boolean field,
        // like perform-full-rule-analysis, to the config which would trigger using all their workspace files here instead.
        let cwd: string = process.cwd();
        if (this.userEslintConfigFile) {
            // This helps but might still not be the best. We might need to receive all files by passing in workspace files to the rules command.
            cwd = path.dirname(this.userEslintConfigFile);
        }
        const extensionsToScan: string[] = ['.js', '.cjs', '.mjs', '.ts'];
        // return extensionsToScan.map(ext => `${cwd}${path.sep}dummy${ext}`);

        // Wow this isn't that bad actually. But it might be really bad if we went to the root folder though... so capping to first 100.
        const psuedoProjFiles: string[] = expandToListAllFiles([cwd]).filter(f =>
            !f.includes(path.sep + 'node_modules' + path.sep) && extensionsToScan.includes(path.extname(f)));
        // return psuedoProjFiles.slice(0,100);
        return psuedoProjFiles.concat(extensionsToScan.map(ext => `${cwd}${path.sep}dummy${ext}`));

        // I'm starting to think it might be best to pass in the workspace files instead.
    }
}

/**
 * Expands a list of files and/or folders to be a list of all contained files, including the files found in subfolders
 */
export function expandToListAllFiles(absoluteFileOrFolderPaths: string[]): string[] {
    let allFiles: string[] = [];
    for (const fileOrFolder of absoluteFileOrFolderPaths) {
        if (fs.statSync(fileOrFolder).isDirectory()) {
            const absSubPaths: string[] = fs.readdirSync(fileOrFolder).map(f => fileOrFolder + path.sep + f);
            allFiles = [...allFiles, ...expandToListAllFiles(absSubPaths)];
        } else { // isFile
            allFiles.push(fileOrFolder);
        }
    }
    return allFiles;
}