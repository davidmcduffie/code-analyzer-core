import * as EngineApi from '@salesforce/code-analyzer-engine-api/';
import { RegexExecutor } from './executor';

export class RegexEnginePlugin extends EngineApi.EnginePluginV1 {

    getAvailableEngineNames(): string[] {
        return [RegexEngine.NAME];
    }

    createEngine(engineName: string): EngineApi.Engine {
        if (engineName === RegexEngine.NAME) {
            return new RegexEngine()
        }  else {
            throw new Error(`Unsupported engine name: ${engineName}`);
        }
    }
}

export class RegexEngine extends EngineApi.Engine {
    static readonly NAME = "regex"

    getName(): string {
        return RegexEngine.NAME;
    }

    async describeRules(): Promise<EngineApi.RuleDescription[]> {
        return [
            {
                name: "TrailingWhitespaceRule",
                severityLevel: EngineApi.SeverityLevel.Low,
                type: EngineApi.RuleType.Standard,
                tags: ["Recommended", "CodeStyle"],
                /* TODO: Add rule description and resourceUrls for trailing whitespace rule*/ 
                description: "",
                resourceUrls: [""]
            },
        ];
    }

    private async verifyRule(ruleName: string){
        const rules: EngineApi.RuleDescription[] = await this.describeRules()
        for (const rule of rules){
            if (ruleName === rule.name){
                return true;
            }
        }
        return false
        ;
    }

    async runRules(ruleNames: string[], runOptions: EngineApi.RunOptions): Promise<EngineApi.EngineRunResults> {
        /* TODO: Update section with logic for implementing trailing whitespace rule*/ 
        let violations: EngineApi.Violation[] = [];
        
        
        for (const rule of ruleNames) {
            const ruleVerified: boolean = await this.verifyRule(rule)
            if (!ruleVerified){
                throw new Error(`The rule: ${rule} was not found in the engine's rules`)
            } else {
                const executor = new RegexExecutor()
                violations = violations.concat(await executor.execute(runOptions.workspaceFiles))

            }
        }
        const runResults: EngineApi.EngineRunResults = {violations: violations}

        return runResults

    } 

}