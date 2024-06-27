
import { changeWorkingDirectoryToPackageRoot } from "./test-helpers";
import path from "node:path";
import { RegexExecutor } from '../src/executor';
import { EXPECTED_CODE_LOCATION_1, EXPECTED_CODE_LOCATION_2, EXPECTED_CODE_LOCATION_3, TRAILING_WHITESPACE_RESOURCE_URLS, TRAILING_WHITESPACE_RULE_MESSAGE} from './test-config';
import { Violation } from "@salesforce/code-analyzer-engine-api";

changeWorkingDirectoryToPackageRoot();
 
console.log(path.resolve("packages", "code-analyzer-regex-engine", "test", "test-data"))
describe("Executor tests", () => {
    let executor: RegexExecutor;
    beforeAll(() => {
        executor = new RegexExecutor();
    });
    
    /* I realize that I am not totally certain what the intended behavior of this case should be. But it might be better as just a no-op*/
    it("If I have a file that's not an Apex class, execute() should not return any violations.", async () => 
    {
        const file = path.resolve("test", "test-data", "1_notApexClassWithWhitespace", "something.xml")
        const violations: Violation[] = await executor.execute([file])
        const expViolations: Violation[] = [];
        expect(violations).toStrictEqual(expViolations);
    });

    it("If execute() is called with an Apex class that has trailing whitespace, emit violation", async () => {
        const file = path.resolve("test", "test-data", "2_apexClasses", "myOuterClass.cls")
        const violations: Violation[] = await executor.execute([file])
        expect(violations).toHaveLength(1)
        expect(violations[0].message).toStrictEqual(TRAILING_WHITESPACE_RULE_MESSAGE)
        expect(violations[0].resourceUrls).toStrictEqual(TRAILING_WHITESPACE_RESOURCE_URLS)
        expect(violations[0].codeLocations).toHaveLength(1)
        expect(violations[0].codeLocations).toContainEqual(EXPECTED_CODE_LOCATION_1)

    });

    it("If execute() is pointed to an Apex class without trailing whitespace ensure there are no erroneous violations", async () => {
        const file = path.resolve("test", "test-data", "4_ApexClassWithoutWhitespace", "myOuterClass.cls")
        const violations: Violation[] = await executor.execute([file])
        const expViolations: Violation[] = [];
        expect(violations).toStrictEqual(expViolations);

    });

    it('Ensure that execute() can catch multiple violations in the same file', async () => {
        const file = path.resolve("test", "test-data", "2_apexClasses", "myClass.cls");
        const violations: Violation[] = await executor.execute([file]);
        expect(violations).toHaveLength(1)
        expect(violations[0].message).toStrictEqual(TRAILING_WHITESPACE_RULE_MESSAGE)
        expect(violations[0].resourceUrls).toStrictEqual(TRAILING_WHITESPACE_RESOURCE_URLS)
        expect(violations[0].codeLocations).toHaveLength(2)
        expect(violations[0].codeLocations).toContainEqual(EXPECTED_CODE_LOCATION_2)
        expect(violations[0].codeLocations).toContainEqual(EXPECTED_CODE_LOCATION_3)

    })

    it("Ensure execute() can be called on a list Apex classes and properly emits errors", async () => {
        const file1 = path.resolve("test", "test-data", "2_apexClasses", "myOuterClass.cls")
        const file2 = path.resolve("test", "test-data", "2_apexClasses", "myClass.cls");
        const file3 = path.resolve("test", "test-data", "4_ApexClassWithoutWhitespace", "myOuterClass.cls")
        const violations: Violation[] = await executor.execute([file1, file2, file3])
        expect(violations[0].message).toStrictEqual(TRAILING_WHITESPACE_RULE_MESSAGE)
        expect(violations[0].resourceUrls).toStrictEqual(TRAILING_WHITESPACE_RESOURCE_URLS)
        expect(violations[0].codeLocations).toHaveLength(3)
        expect(violations[0].codeLocations).toContainEqual(EXPECTED_CODE_LOCATION_1)
        expect(violations[0].codeLocations).toContainEqual(EXPECTED_CODE_LOCATION_2)
        expect(violations[0].codeLocations).toContainEqual(EXPECTED_CODE_LOCATION_3)
    });



})


