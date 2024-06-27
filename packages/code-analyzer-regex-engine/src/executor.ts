import { Violation, CodeLocation } from "@salesforce/code-analyzer-engine-api";
import fs from "node:fs";
import path from "node:path";

const APEX_CLASS_FILE_EXT: string = ".cls"

export class RegexExecutor {

    async execute(allFiles: string[]): Promise<Violation[]>{
        let violations: Violation[] = []

        for (const file of allFiles) {
            const fileData = fs.statSync(file)
            if (fileData.isFile()) {
                violations = violations.concat(await this.scanFile(file));
            }  
        }
        
        return violations;
    }

    private async scanFile(fileName: string): Promise<Violation[]> {
        const fileType: string = path.extname(fileName)
        const violations: Violation[] = fileType === APEX_CLASS_FILE_EXT ? await this.getViolations(fileName) : [];

        return violations;
    }

    private async getViolations(fileName: string): Promise<Violation[]> {
        const violations: Violation[] = [];
        const data: string = fs.readFileSync(fileName, {encoding: 'utf8'})
        const split_data: string[] = data.split("\n")
        let regex: RegExp;
        let match: RegExpExecArray | null;

        split_data.forEach((line: string, lineNum: number) => {
            let violation: Violation;
            let codeLocation: CodeLocation
            regex = /(?<=[^ \t\r\n\f])[ \t]+$/
            match = regex.exec(line)
            if (match) {
                codeLocation = {
                    file: fileName,
                    startLine: lineNum + 1,
                    startColumn: match.index
                }
                violation = {
                    ruleName: "Trailing Whitespace",
                    codeLocations: [codeLocation],
                    primaryLocationIndex: 0,
                    message: "This rule prevents trailing whitespace (tabs or spaces) at the end of lines in Apex classes"
                }
                violations.push(violation)
            }
            
        })

        return violations;
    }
}