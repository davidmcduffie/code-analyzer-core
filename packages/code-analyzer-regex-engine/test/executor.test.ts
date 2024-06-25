import * as EngineApi from '@salesforce/code-analyzer-engine-api';
import { changeWorkingDirectoryToPackageRoot } from "./test-helpers";
import path from "node:path";
import { RegexExecutor } from '../src/executor';
import { FILE_LOCATION_1, FILE_LOCATION_2, FILE_LOCATION_3, FILE_LOCATION_4} from './config';

changeWorkingDirectoryToPackageRoot();

const TRAILING_WHITESPACE_RULE_MESSAGE = "";
const TRAILING_WHITESPACE_RESOURCE_URLS = [""]


const EXPECTED_CODE_LOCATION_1: EngineApi.CodeLocation = {
    file: FILE_LOCATION_2,
    startLine: 6,
    startColumn: 1
}

const EXPECTED_CODE_LOCATION_2: EngineApi.CodeLocation = {
    file: FILE_LOCATION_3,
    startLine: 5,
    startColumn: 4
}

const EXPECTED_CODE_LOCATION_3: EngineApi.CodeLocation = {
    file: FILE_LOCATION_4,
    startLine: 2,
    startColumn: 39
}

const EXPECTED_CODE_LOCATION_4: EngineApi.CodeLocation = {
    file: FILE_LOCATION_4,
    startLine: 6,
    startColumn: 1
}

// const EXPECTED_CODE_LOCATION_5: EngineApi.CodeLocation = {

// }

// const EXPECTED_CODE_LOCATION_6: EngineApi.CodeLocation = {

// }

const EXPECTED_VIOLATION_1: EngineApi.Violation = {
    ruleName: "Trailing Whitespace",
    codeLocations: [EXPECTED_CODE_LOCATION_1],
    primaryLocationIndex: 0,
    message: TRAILING_WHITESPACE_RULE_MESSAGE,
    resourceUrls: TRAILING_WHITESPACE_RESOURCE_URLS
    
};

const EXPECTED_VIOLATION_2: EngineApi.Violation = {
    ruleName: "Trailing Whitespace",
    codeLocations: [EXPECTED_CODE_LOCATION_2],
    primaryLocationIndex: 0,
    message: TRAILING_WHITESPACE_RULE_MESSAGE,
    resourceUrls: TRAILING_WHITESPACE_RESOURCE_URLS
    
};

const EXPECTED_VIOLATION_3: EngineApi.Violation = {
    ruleName: "Trailing Whitespace",
    codeLocations: [EXPECTED_CODE_LOCATION_3, EXPECTED_CODE_LOCATION_4],
    primaryLocationIndex: 0,
    message: TRAILING_WHITESPACE_RULE_MESSAGE,
    resourceUrls: TRAILING_WHITESPACE_RESOURCE_URLS
}

// const EXPECTED_VIOLATION_4: EngineApi.Violation = {
//     ruleName: "Trailing Whitespace",
//     codeLocations: [EXPECTED_CODE_LOCATION_5, EXPECTED_CODE_LOCATION_6],
//     primaryLocationIndex: 0,
//     message: TRAILING_WHITESPACE_RULE_MESSAGE,
//     resourceUrls: TRAILING_WHITESPACE_RESOURCE_URLS
// }
 
describe("Executor tests", () => {
    let executor: RegexExecutor;
    beforeAll(() => {
        executor = new RegexExecutor();
    });

    it("If I have a file that's not an Apex class, the execute() throws an error with proper error message", async () => 
    {
        const file = path.resolve("test", "test-data", "1_notApexClassWithWhitespace", "something.xml")
        expect(async () => {await executor.execute([file])}).rejects.toThrow(`The scanned file ${FILE_LOCATION_1} is not an Apex class. Therefore, it is not currently supported by the regex engine.`)
    });

    it("If execute() is called with an Apex class that has trailing whitespace, emit violation", async () => {
        const file = path.resolve("test", "test-data", "2_notApexClassWithoutWhitespace", "myOuterClass.cls")
        const violations: EngineApi.Violation[] = await executor.execute([file])
        expect(violations).toStrictEqual([EXPECTED_VIOLATION_1])

    });

    it('Check that execute() supports scanning a list of files', async () => {
        const file1 = path.resolve("test", "test-data", "2_notApexClassWithoutWhitespace", "myOuterClass.cls")
        const file2 = path.resolve("test", "test-data", "2_notApexClassWithoutWhitespace", "myOut.cls")
        const files = [file1, file2]

        const violations: EngineApi.Violation[] = await executor.execute(files)
        expect(violations).toStrictEqual([EXPECTED_VIOLATION_1, EXPECTED_VIOLATION_2])
    });

    it("If user wants to scan file and it doesn't exist, emit the proper error message", async () => {
        const file = path.resolve("test", "test-data", "2_notApexClassWithoutWhitespace", "myOuterClass2.cls")
        expect(async () => {await executor.execute([file])}).rejects.toThrow(`The file or directory that you are trying to open ${file} does not exist.`)

    })

    it("If execute() is pointed to an Apex class without trailing whitespace ensure there are no erroneous violations", async () => {
        const file = path.resolve("test", "test-data", "3_ApexClassWithoutWhitespace", "myOuterClass.cls")
        const violations: EngineApi.Violation[] = await executor.execute([file])
        const expViolations: EngineApi.Violation[] = [];
        expect(violations).toStrictEqual(expViolations);

    })

    it("If user wants to scan a directory that doesn't exist, emit the proper error message", async () =>  {
        const file = path.resolve("test", "test-data", "dirThatDoesntExist");
        expect(async () => {await executor.execute([file])}).rejects.toThrow(`The file or directory that you are trying to open ${file} does not exist.`)
        
    });

    it('Ensure that execute() can catch multiple errors in the same file', async () => {
        const file = path.resolve("test", "test-data", "2_notApexClassWithoutWhitespace", "myClass.cls");
        const violations: EngineApi.Violation[] = await executor.execute([file]);
        const expViolations: EngineApi.Violation[] = [EXPECTED_VIOLATION_3];
        expect(violations).toStrictEqual(expViolations)

    })

    it("Ensure execute() can be called on a directory with multiple Apex classes and properly emits errors", async () => {
        const dir = path.resolve("test", "test-data", "2_notApexClassWithoutWhitespace");
        const violations: EngineApi.Violation[] = await executor.execute([dir]);
        const expViolations: EngineApi.Violation[] = [EXPECTED_VIOLATION_3, EXPECTED_VIOLATION_2, EXPECTED_VIOLATION_1]
        expect(violations).toStrictEqual(expViolations)
    });

    it("Ensure execute() can be called on a directory with subdirectories with accurate violations reports", async () => {


    })


})


