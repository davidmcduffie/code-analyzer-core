import {
    ConfigObject,
    DescribeOptions,
    Engine,
    EnginePluginV1,
    EngineRunResults,
    RuleDescription,
    RuleType,
    RunOptions,
    SeverityLevel,
    Violation
} from "@salesforce/code-analyzer-engine-api";
import { RegexExecutor } from './executor';


export class RegexEnginePlugin extends EnginePluginV1 {

    getAvailableEngineNames(): string[] {
        return [RegexEngine.NAME];
    }

    async createEngine(engineName: string, _config: ConfigObject): Promise<Engine> {
        if (engineName === RegexEngine.NAME) {
            return new RegexEngine()
        }  else {
            throw new Error(`Unsupported engine name: ${engineName}`);
        }
    }
}

export class RegexEngine extends Engine {
    static readonly NAME = "regex"

    getName(): string {
        return RegexEngine.NAME;
    }

    async describeRules(_describeOptions: DescribeOptions): Promise<RuleDescription[]> {
        return [
            {
                name: "TrailingWhitespaceRule",
                severityLevel: SeverityLevel.Low,
                type: RuleType.Standard,
                tags: ["Recommended", "CodeStyle"],
                /* TODO: Add rule description and resourceUrls for trailing whitespace rule*/ 
                description: "",
                resourceUrls: [""]
            },
        ];
    }

    async runRules(_ruleNames: string[], runOptions: RunOptions): Promise<EngineRunResults> {
        let violations: Violation[] = [];
        const executor = new RegexExecutor()
        const fullFileList: string[] = await runOptions.workspace.getExpandedFiles()
        violations = violations.concat(await executor.execute(fullFileList))
        const runResults: EngineRunResults = {violations: violations}
        return runResults
    } 

}