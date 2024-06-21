import { Violation, CodeLocation } from "@salesforce/code-analyzer-engine-api";
import fs from "node:fs";
import path from "node:path";

const APEX_CLASS_FILE_EXT: string = ".cls"

export class RegexExecutor {

    async execute(allFiles: string[]): Promise<Violation[]>{
        let codeLocations: CodeLocation[] = [];
        const violations: Violation[] = []

        for (const file of allFiles) {
            const fileData = fs.statSync(file)
            if (fileData.isFile()) {
                codeLocations = codeLocations.concat(await this.scanFile(file));
            }  
        }

        if (codeLocations.length > 0){
            const violation: Violation = {
                ruleName: "Trailing Whitespace",
                codeLocations: codeLocations,
                primaryLocationIndex: 0,
                message: "",
                resourceUrls: [""]
            }
            violations.push(violation)
        } 
        return violations;
    }

    private async scanFile(fileName: string): Promise<CodeLocation[]> {
        const fileType: string = path.extname(fileName)
        let codeLocations: CodeLocation[] = [];
        if (fileType === APEX_CLASS_FILE_EXT){
            codeLocations = await this.getViolationCodeLocations(fileName)
        }
        return codeLocations;
    }

    private async getViolationCodeLocations(fileName: string): Promise<CodeLocation[]> {
        const codeLocations: CodeLocation[] = [];
        const data: string = fs.readFileSync(fileName, {encoding: 'utf8', flag: 'r'})
        const split_data: string[] = data.split("\n")
        let regex: RegExp;
        let match: RegExpExecArray | null;

        split_data.forEach((line: string, lineNum: number) => {
            let codeLocation: CodeLocation;
            regex = /(?<=[^ \t\r\n\f])[ \t]+$/
            match = regex.exec(line)
            if (match) {
                codeLocation = {
                    file: fileName,
                    startLine: lineNum + 1,
                    startColumn: match.index
                }
                codeLocations.push(codeLocation)
            }
        })
        return codeLocations
    }
}