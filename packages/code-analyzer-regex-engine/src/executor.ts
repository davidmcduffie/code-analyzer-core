import * as EngineApi from '@salesforce/code-analyzer-engine-api';
import fs from "node:fs";
import path from "node:path";

const APEX_CLASS_FILE_EXT: string = ".cls"

export class RegexExecutor {

    async execute(filesAndFoldersToScan: string[]): Promise<EngineApi.Violation[]>{
        let codeLocations: EngineApi.CodeLocation[] = [];
        const violations: EngineApi.Violation[] = []

        for (const fileOrFolder of filesAndFoldersToScan) {
            let fileData: fs.Stats;
            try {
                fileData = fs.statSync(fileOrFolder)
            } catch {
                throw new Error(`The file or directory that you are trying to open ${fileOrFolder} does not exist.`)

            }
            if (fileData.isFile()) {
                codeLocations = codeLocations.concat(await this.scanFile(fileOrFolder));
            } else {
                codeLocations = codeLocations.concat(await this.scanDir(fileOrFolder))
            }
            
        }

        if (codeLocations.length > 0){
            const violation: EngineApi.Violation = {
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

    private async scanDir(dirName: string): Promise<EngineApi.CodeLocation[]>{
        const files: string[] = await this.collectFilesFromSubdirs(dirName, []);
        let codeLocations: EngineApi.CodeLocation[] = [];

        for (const file of files) {
            codeLocations = codeLocations.concat(await this.scanFile(file))
        }

        return codeLocations;

    }

    /*TODO: add call limit to prevent stack overflow (optimization for later) */
    private async collectFilesFromSubdirs(dirPath: string, fileNames: string[]): Promise<string[]>{
        const currentDirectoryFiles: string[] = fs.readdirSync(dirPath);
        for (const fileOrFolder of currentDirectoryFiles) {
            const fullPath: string = path.join(dirPath, fileOrFolder)
            const fileType: string = path.extname(fullPath)
            if ((fs.statSync(fullPath).isFile()) && (fileType === APEX_CLASS_FILE_EXT)){
                fileNames.push(fullPath);
            } else {
                this.collectFilesFromSubdirs(fullPath, fileNames);
            }

        }
        return fileNames;
    }

    private async scanFile(fileName: string): Promise<EngineApi.CodeLocation[]> {
        const fileType: string = path.extname(fileName)
        if (fileType !== APEX_CLASS_FILE_EXT){
            throw new Error(`The scanned file ${fileName} is not an Apex class. Therefore, it is not currently supported by the regex engine.`)
        } else {
            const codeLocations: EngineApi.CodeLocation[] = await this.getViolationCodeLocations(fileName)
            return codeLocations;
        }
 
    }

    private async getViolationCodeLocations(fileName: string): Promise<EngineApi.CodeLocation[]> {
        const codeLocations: EngineApi.CodeLocation[] = [];
        const data: string = fs.readFileSync(fileName, {encoding: 'utf8', flag: 'r'})
        const split_data: string[] = data.split("\n")
        let regex: RegExp;
        let match: RegExpExecArray | null;

        split_data.forEach((line: string, lineNum: number) => {
            let codeLocation: EngineApi.CodeLocation;
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