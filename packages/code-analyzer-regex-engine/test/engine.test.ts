import {RegexEnginePlugin, RegexEngine} from "../src/RegexEnginePlugin";
import * as EngineApi from '@salesforce/code-analyzer-engine-api';
import { changeWorkingDirectoryToPackageRoot } from "./test-helpers";
import path from "node:path";
import { TRAILING_WHITESPACE_RULE_MESSAGE, TRAILING_WHITESPACE_RESOURCE_URLS, EXPECTED_CODE_LOCATION_3, EXPECTED_CODE_LOCATION_4 } from "./config";

changeWorkingDirectoryToPackageRoot();

// const EXPECTED_VIOLATION_1: EngineApi.Violation = {
//     ruleName: "Trailing Whitespace",
//     codeLocations: [EXPECTED_CODE_LOCATION_1],
//     primaryLocationIndex: 0,
//     message: TRAILING_WHITESPACE_RULE_MESSAGE,
//     resourceUrls: TRAILING_WHITESPACE_RESOURCE_URLS
    
// };

// const EXPECTED_VIOLATION_2: EngineApi.Violation = {
//     ruleName: "Trailing Whitespace",
//     codeLocations: [EXPECTED_CODE_LOCATION_2],
//     primaryLocationIndex: 0,
//     message: TRAILING_WHITESPACE_RULE_MESSAGE,
//     resourceUrls: TRAILING_WHITESPACE_RESOURCE_URLS
    
// };

// const EXPECTED_VIOLATION_3: EngineApi.Violation = {
//     ruleName: "Trailing Whitespace", 
//     codeLocations: [EXPECTED_CODE_LOCATION_1, EXPECTED_CODE_LOCATION_2],
//     primaryLocationIndex: 0,
//     message: TRAILING_WHITESPACE_RULE_MESSAGE,
//     resourceUrls: TRAILING_WHITESPACE_RESOURCE_URLS
// }

// const EXPECTED_VIOLATION_4: EngineApi.Violation = {
//     ruleName: "Trailing Whitespace",
//     codeLocations: [EXPECTED_CODE_LOCATION_3, EXPECTED_CODE_LOCATION_4],
//     primaryLocationIndex: 0,
//     message: TRAILING_WHITESPACE_RULE_MESSAGE,
//     resourceUrls: TRAILING_WHITESPACE_RESOURCE_URLS
// }

// const EXPECTED_VIOLATION_5: EngineApi.Violation = {
//     ruleName: "Trailing Whitespace",
//     codeLocations: [EXPECTED_CODE_LOCATION_5, EXPECTED_CODE_LOCATION_6],
//     primaryLocationIndex: 0,
//     message: TRAILING_WHITESPACE_RULE_MESSAGE,
//     resourceUrls: TRAILING_WHITESPACE_RESOURCE_URLS
// }

describe('Regex Engine Tests', () => {
    let engine: RegexEngine;
    beforeAll(() => {
        engine = new RegexEngine();
    });

    it('Engine name is accessible and correct', () => {
        const name: string = engine.getName();
        expect(name).toEqual("regex");
        
    });
    
    it('Calling describeRules() on an engine should return the single trailing whitespace rule', async () => {
        const rules_desc: EngineApi.RuleDescription[]= await engine.describeRules();
        const engineRules = [
            {
                name: "TrailingWhitespaceRule",
                severityLevel: EngineApi.SeverityLevel.Low,
                type: EngineApi.RuleType.Standard,
                tags: ["Recommended", "CodeStyle"],
                description: "",
                resourceUrls: [""]
            },
        ];
        expect(rules_desc).toEqual(engineRules)
    });

    it('If runRules() is called with a rule that does not exist, then emit an appropriate error', async () => {
        const runOptions: EngineApi.RunOptions = {"workspaceFiles": ["path/to/dir"]}
        const fakeRule: string[] = ['NotARule']
        expect(async () => {await engine.runRules(fakeRule, runOptions)}).rejects.toThrow(`The rule: NotARule was not found in the engine's rules`)
    })

    it('If runRules() is pointed to a directory that does not exist, emit the appropriate error', async () => {
        const runOptions: EngineApi.RunOptions = {"workspaceFiles": ["path/to/dir"]}
        const ruleNames: string[] = ['TrailingWhitespaceRule']
        expect(async () => {await engine.runRules(ruleNames, runOptions)}).rejects.toThrow(`The file or directory that you are trying to open path/to/dir does not exist.`)
    })

    it('Confirm runRules() returns ', async () => {
        const ruleNames: string[] = ['TrailingWhitespaceRule']
        const filePath = path.resolve("test", "test-data", "2_apexClasses", "myClass.cls")
        const runOptions: EngineApi.RunOptions = {"workspaceFiles": [filePath]}
        const runResults: EngineApi.EngineRunResults = await engine.runRules(ruleNames, runOptions);
        expect(runResults.violations).toHaveLength(1)
        expect(runResults.violations[0].message).toStrictEqual(TRAILING_WHITESPACE_RULE_MESSAGE)
        expect(runResults.violations[0].resourceUrls).toStrictEqual(TRAILING_WHITESPACE_RESOURCE_URLS)
        expect(runResults.violations[0].codeLocations).toHaveLength(2)
        expect(runResults.violations[0].codeLocations).toContainEqual(EXPECTED_CODE_LOCATION_3)
        expect(runResults.violations[0].codeLocations).toContainEqual(EXPECTED_CODE_LOCATION_4)
        engine.runRules(ruleNames, runOptions);
    })
});

describe('RegexEnginePlugin Tests' , () => {
    let pluginEngine: RegexEngine 
    let enginePlugin: RegexEnginePlugin;
    beforeAll(() => {
        enginePlugin = new RegexEnginePlugin();
        pluginEngine = enginePlugin.createEngine("regex") as RegexEngine;
    });

    it('Check that I can get all available engine names', () => {
        const availableEngines: string[] = ['regex'] 
        expect(enginePlugin.getAvailableEngineNames()).toStrictEqual(availableEngines)
    })
   
    it('Check that engine created from the RegexEnginePlugin has expected name', () => {
        const engineName = "regex";
        expect(pluginEngine.getName()).toStrictEqual(engineName)
    });

    it('Check that engine created from the RegexEnginePlugin has expected output when describeRules() is called', async () => {
        const expEngineRules = [
            {
                name: "TrailingWhitespaceRule",
                severityLevel: EngineApi.SeverityLevel.Low,
                type: EngineApi.RuleType.Standard,
                tags: ["Recommended", "CodeStyle"],
                description: "",
                resourceUrls: [""]
            },
        ];
        const engineRules: EngineApi.RuleDescription[] = await pluginEngine.describeRules()
        expect(engineRules).toStrictEqual(expEngineRules)
    });

    it('', () => {
        const ruleNames: string[] = ['TrailingWhitespaceRule']
        const runOptions: EngineApi.RunOptions = {"workspaceFiles": ["path/to/dir"] }
        pluginEngine.runRules(ruleNames, runOptions);
    });

    it('If I make an engine with an invalid name, it should throw an error with the proper error message', () => { 
        expect(() => {enginePlugin.createEngine('OtherEngine')}).toThrow("Unsupported engine name: OtherEngine");
    });

    
    
});
