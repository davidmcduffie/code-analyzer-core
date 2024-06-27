import path from "node:path";
import { changeWorkingDirectoryToPackageRoot } from "./test-helpers";
import * as EngineApi from '@salesforce/code-analyzer-engine-api';

changeWorkingDirectoryToPackageRoot();

export const FILE_LOCATION_1 = path.resolve("packages", "code-analyzer-regex-engine", "test", "test-data", "2_apexClasses", "myOuterClass.cls")
export const FILE_LOCATION_2 = path.resolve("packages", "code-analyzer-regex-engine", "test", "test-data", "2_apexClasses", "myOut.cls")
export const FILE_LOCATION_3 = path.resolve("packages", "code-analyzer-regex-engine", "test", "test-data", "2_apexClasses", "myClass.cls")
export const FILE_LOCATION_4 = path.resolve("packages", "code-analyzer-regex-engine", "test", "test-data", "3_FolderWithMultipleWhitespaceApexClasses", "myOuterClass.cls")
export const FILE_LOCATION_5 = path.resolve("packages", "code-analyzer-regex-engine", "test", "test-data", "3_FolderWithMultipleWhitespaceApexClasses", "subDir", "myOuterClass.cls")
export const TRAILING_WHITESPACE_RULE_MESSAGE = "";
export const TRAILING_WHITESPACE_RESOURCE_URLS = [""]

export const EXPECTED_CODE_LOCATION_1: EngineApi.CodeLocation = {
    file: FILE_LOCATION_1,
    startLine: 6,
    startColumn: 1
}

export const EXPECTED_CODE_LOCATION_2: EngineApi.CodeLocation = {
    file: FILE_LOCATION_3,
    startLine: 2,
    startColumn: 39
}

export const EXPECTED_CODE_LOCATION_3: EngineApi.CodeLocation = {
    file: FILE_LOCATION_3,
    startLine: 6,
    startColumn: 1
}

export const EXPECTED_CODE_LOCATION_4: EngineApi.CodeLocation = {
    file: FILE_LOCATION_4, 
    startLine: 6,
    startColumn: 1
}

export const EXPECTED_CODE_LOCATION_5: EngineApi.CodeLocation = {
    file: FILE_LOCATION_5, 
    startLine: 6,
    startColumn: 1

}