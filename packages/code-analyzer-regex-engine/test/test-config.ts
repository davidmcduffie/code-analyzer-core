import path from "node:path";
import { changeWorkingDirectoryToPackageRoot } from "./test-helpers";
import { CodeLocation, Violation} from "@salesforce/code-analyzer-engine-api";

changeWorkingDirectoryToPackageRoot();

export const FILE_LOCATION_1 = path.resolve("packages", "code-analyzer-regex-engine", "test", "test-data", "2_apexClasses", "myOuterClass.cls")
export const FILE_LOCATION_2 = path.resolve("packages", "code-analyzer-regex-engine", "test", "test-data", "2_apexClasses", "myOut.cls")
export const FILE_LOCATION_3 = path.resolve("packages", "code-analyzer-regex-engine", "test", "test-data", "2_apexClasses", "myClass.cls")
export const FILE_LOCATION_4 = path.resolve("packages", "code-analyzer-regex-engine", "test", "test-data", "3_FolderWithMultipleWhitespaceApexClasses", "myOuterClass.cls")
export const FILE_LOCATION_5 = path.resolve("packages", "code-analyzer-regex-engine", "test", "test-data", "3_FolderWithMultipleWhitespaceApexClasses", "subDir", "myOuterClass.cls")
export const TRAILING_WHITESPACE_RULE_MESSAGE = "This rule prevents trailing whitespace (tabs or spaces) at the end of lines in Apex classes";
export const TRAILING_WHITESPACE_RESOURCE_URLS = []

const EXPECTED_CODE_LOCATION_1: CodeLocation = {
    file: FILE_LOCATION_1,
    startLine: 6,
    startColumn: 1
}

const EXPECTED_CODE_LOCATION_2: CodeLocation = {
    file: FILE_LOCATION_3,
    startLine: 2,
    startColumn: 39
}

const EXPECTED_CODE_LOCATION_3: CodeLocation = {
    file: FILE_LOCATION_3,
    startLine: 6,
    startColumn: 1
}

// const EXPECTED_CODE_LOCATION_4: CodeLocation = {
//     file: FILE_LOCATION_4, 
//     startLine: 6,
//     startColumn: 1
// }

// const EXPECTED_CODE_LOCATION_5: CodeLocation = {
//     file: FILE_LOCATION_5, 
//     startLine: 6,
//     startColumn: 1
// } 

export const EXPECTED_VIOLATION_1: Violation[] = [
    {
        ruleName: "Trailing Whitespace",
        message: TRAILING_WHITESPACE_RULE_MESSAGE,
        primaryLocationIndex: 0,
        codeLocations: [EXPECTED_CODE_LOCATION_1]
    }
]

export const EXPECTED_VIOLATION_2: Violation[] = [
    {
        ruleName: "Trailing Whitespace",
        message: TRAILING_WHITESPACE_RULE_MESSAGE,
        primaryLocationIndex: 0,
        codeLocations: [EXPECTED_CODE_LOCATION_2]
    },
    {
        ruleName: "Trailing Whitespace",
        message: TRAILING_WHITESPACE_RULE_MESSAGE,
        primaryLocationIndex: 0,
        codeLocations: [EXPECTED_CODE_LOCATION_3]

    }  
]

export const EXPECTED_VIOLATION_3: Violation[] = [
    {
        ruleName: "Trailing Whitespace",
        message: TRAILING_WHITESPACE_RULE_MESSAGE,
        primaryLocationIndex: 0,
        codeLocations: [EXPECTED_CODE_LOCATION_1]
    },
    {
        ruleName: "Trailing Whitespace",
        message: TRAILING_WHITESPACE_RULE_MESSAGE,
        primaryLocationIndex: 0,
        codeLocations: [EXPECTED_CODE_LOCATION_2]
    },
    {
        ruleName: "Trailing Whitespace",
        message: TRAILING_WHITESPACE_RULE_MESSAGE,
        primaryLocationIndex: 0,
        codeLocations: [EXPECTED_CODE_LOCATION_3]

    }  
]

