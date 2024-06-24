import {
    ConfigObject,
    Engine,
    EnginePluginV1,
    EngineRunResults,
    RuleDescription,
    RuleType,
    RunOptions,
    SeverityLevel,
    Violation
} from '@salesforce/code-analyzer-engine-api'
import {getMessage} from "./messages";
import {ESLint, Linter, Rule} from "eslint";
import path from "node:path";
import {ESLintRuleStatus, ESLintRuleType} from "./enums";
import {ESLintStrategy, LegacyESLintStrategy} from "./strategies";
import process from "node:process";
import fs from "node:fs";

export class ESLintEnginePlugin extends EnginePluginV1 {
    getAvailableEngineNames(): string[] {
        return [ESLintEngine.NAME];
    }

    createEngine(engineName: string, engineConfig: ConfigObject): Engine {
        if (engineName === ESLintEngine.NAME) {
            return new ESLintEngine(engineConfig);
        }
        throw new Error(getMessage('CantCreateEngineWithUnknownEngineName', engineName));
    }
}

export class ESLintEngine extends Engine {
    static readonly NAME = "eslint";

    private readonly engineConfig: ConfigObject;
    private folderForCache: string = '';
    private cachedEslintStrategy?: ESLintStrategy; // Not passed in. Will lazy construct this to use async if needed

    constructor(engineConfig: ConfigObject) {
        super();
        this.engineConfig = engineConfig;
    }

    getName(): string {
        return ESLintEngine.NAME;
    }

    async describeRules(): Promise<RuleDescription[]> {
        const strategy: ESLintStrategy = this.getStrategy();
        const ruleStatuses: Map<string, ESLintRuleStatus> = await strategy.calculateRuleStatuses();

        const ruleDescriptions: RuleDescription[] = [];
        for (const [ruleName, ruleStatus] of ruleStatuses) {
            const ruleMetadata: Rule.RuleMetaData = strategy.getMetadataFor(ruleName);
            if (ruleMetadata) { // do not include rules that don't have metadata
                ruleDescriptions.push(toRuleDescription(ruleName, ruleMetadata, ruleStatus));
            }
        }

        return ruleDescriptions.sort((d1,d2) => d1.name.localeCompare(d2.name));
    }

    async runRules(ruleNames: string[], runOptions: RunOptions): Promise<EngineRunResults> {
        const strategy: ESLintStrategy = this.getStrategy();
        const eslintResults: ESLint.LintResult[] = await strategy.run(ruleNames, runOptions.workspaceFiles);
        return {
            violations: toViolations(eslintResults, ruleNames)
        }
    }

    private getStrategy(): ESLintStrategy {
        // Currently we only support legacy eslint configuration files. When we are ready to support the new eslint flat
        // configuration files then we'll want to use https://eslint.org/docs/v8.x/integrate/nodejs-api#loadeslint
        // to help us determine which strategy to take, but note that this would require an await
        // call. So we might need to change createEngine to async (or generate the strategy later on). Also getting
        // all the rule metadata for the flat config world may require us to load in all the config modules and parse
        // them ourselves. See https://github.com/eslint/eslint/discussions/18546.
        if (!this.cachedEslintStrategy || this.folderForCache !== process.cwd()) {  // TODO: Do we want cwd? Or do we want to calculate the workspace root directory?
            const eslintConfigFileValueFromEngineConfig: string | undefined = this.engineConfig['config-file'] as (string | undefined); // TODO: Validate
            const disableJavascriptBaseConfig: boolean = this.engineConfig['disable-javascript-base-config'] ? this.engineConfig['disable-javascript-base-config'] as boolean : false; // TODO: Validate
            const disableTypescriptBaseConfig: boolean = this.engineConfig['disable-typescript-base-config'] ? this.engineConfig['disable-typescript-base-config'] as boolean : false; // TODO: Validate
            const disableLwcBaseConfig: boolean = this.engineConfig['disable-lwc-base-config'] ? this.engineConfig['disable-base-lwc-rules'] as boolean : false; // TODO: Validate

            const legacyConfigFile: string | undefined = eslintConfigFileValueFromEngineConfig || findLegacyConfigFile();  // See https://github.com/eslint/eslint/issues/18615
            this.cachedEslintStrategy = new LegacyESLintStrategy(legacyConfigFile, disableJavascriptBaseConfig, disableTypescriptBaseConfig, disableLwcBaseConfig);
            this.folderForCache = process.cwd();
        }
        return this.cachedEslintStrategy;
    }
}

function toRuleDescription(name: string, metadata: Rule.RuleMetaData, status: ESLintRuleStatus | undefined): RuleDescription {
    return {
        name: name,
        severityLevel: toSeverityLevel(metadata, status),
        type: RuleType.Standard,
        tags: toTags(metadata, status),
        description: metadata.docs?.description || '',
        resourceUrls: metadata.docs?.url ? [metadata.docs.url] : []
    }
}

function toSeverityLevel(metadata: Rule.RuleMetaData, status: ESLintRuleStatus | undefined): SeverityLevel {
    if (status === ESLintRuleStatus.WARN) {
        return SeverityLevel.Info;
    } else if (metadata.type === ESLintRuleType.PROBLEM) {
        return SeverityLevel.High;
    } else if (metadata.type === ESLintRuleType.LAYOUT) {
        return SeverityLevel.Low;
    }
    return SeverityLevel.Moderate;
}

function toTags(metadata: Rule.RuleMetaData, status: ESLintRuleStatus | undefined): string[] {
    const tags: string[] = [];
    if (status === ESLintRuleStatus.ERROR || status === ESLintRuleStatus.WARN) {
        tags.push('Recommended');
    }
    if (metadata.type) {
        tags.push(metadata.type);
    }
    return tags;
}

function findLegacyConfigFile(): string | undefined {
    const possibleUserConfigFiles = [".eslintrc.js", ".eslintrc.cjs", ".eslintrc.yaml", ".eslintrc.yml", ".eslintrc.json"];
    for (const possibleUserConfigFile of possibleUserConfigFiles) {
        const userConfigFile = path.join(process.cwd(), possibleUserConfigFile);
        if (fs.existsSync(userConfigFile)) {
            return userConfigFile;
        }
    }
    return undefined;
}

function toViolations(eslintResults: ESLint.LintResult[], ruleNames: string[]): Violation[] {
    const violations: Violation[] = [];
    for (const eslintResult of eslintResults) {
        for (const resultMsg of eslintResult.messages) {
            const ruleName = resultMsg.ruleId;
            if(!ruleName) { // TEMP
                console.log(`WARNING: (${eslintResult.filePath}): ${resultMsg.message}`);
                continue;
            } else if (!ruleNames.includes(ruleName)) {
                console.log(`WARNING: A rule with name '${ruleName}' produced a violation, but this rule was not registered so it will not be included in the results. Result:\n${JSON.stringify(eslintResult,null,2)}`);
                continue;
            }
            violations.push(toViolation(eslintResult.filePath, resultMsg));
        }
    }
    return violations;
}

function toViolation(file: string, resultMsg: Linter.LintMessage): Violation {
    // In the future we may want to take advantage of the fix and suggestions fields.
    // See https://eslint.org/docs/v8.x/integrate/nodejs-api#-lintmessage-type.

    // if(!resultMsg.ruleId) {
    //     // TODO: We need to enhance core and the engine api to allow engines to return something like an EngineErrorViolation
    //     // instead of a standard one so that we don't need to throw an exception here.
    //     // throw new Error(resultMsg.message);
    //     console.log(`WARNING: ${resultMsg.message}`);
    // }

    return {
        ruleName: resultMsg.ruleId as string,
        message: resultMsg.message,
        codeLocations: [{
            file: file,
            startLine: Math.max(resultMsg.line, 1),
            startColumn: Math.max(resultMsg.column, 1),
            endLine: resultMsg.endLine ? Math.max(resultMsg.endLine, 1) : undefined,
            endColumn: resultMsg.endColumn ? Math.max(resultMsg.endColumn, 1) : undefined
        }],
        primaryLocationIndex: 0
    };
}