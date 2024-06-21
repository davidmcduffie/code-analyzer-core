import * as EngineApi from '@salesforce/code-analyzer-engine-api';
import fs from "node:fs";
import path from "node:path";
import * as rd from 'readline'
import {once} from 'node:events'

const APEX_CLASS_FILE_EXT: string = ".cls"


export class RegexExecutor {

    async execute(filesAndFoldersToScan: string[]): Promise<EngineApi.Violation[]>{
        let findings: EngineApi.Violation[] = [];
        for (const fileOrFolder of filesAndFoldersToScan) {
            let fileData: fs.Stats;
            try {
                fileData = fs.statSync(fileOrFolder)
            } catch {
                throw new Error(`The file or directory that you are trying to open ${fileOrFolder} does not exist.`)

            }
            if (fileData.isFile()) {
                findings = findings.concat(await this.scanFile(fileOrFolder, []));
            } 
            
        }
        return findings;
    }

    private async scanFile(fileName: string, violations: EngineApi.Violation[]): Promise<EngineApi.Violation[]> {

        if (path.extname(fileName) !== APEX_CLASS_FILE_EXT){
            throw new Error(`The scanned file ${fileName} is not an Apex class. Therefore, it is not currently supported by the regex engine.`)
        } else {
            const codeLocations: EngineApi.CodeLocation[] = await this.getViolationCodeLocations(fileName)
            if (codeLocations.length > 0){
                const violation = {
                    ruleName: "Trailing Whitespace",
                    message: "",
                    resourceUrls: [""],
                    codeLocations: codeLocations,
                    primaryLocationIndex: 0
                }
                violations.push(violation)

            } 
        }

        return violations
 
    }

    private async getViolationCodeLocations(fileName: string): Promise<EngineApi.CodeLocation[]> {
        const codeLocations: EngineApi.CodeLocation[] = [];
        try {
            const line_counter = ((i = 0) => () => ++i)();
            const rl = rd.createInterface({
              input: fs.createReadStream(fileName),
              crlfDelay: Infinity
            });

            rl.on('line', (line, lineNum = line_counter()) => {
              let codeLocation: EngineApi.CodeLocation;
              const regex = new RegExp(`([^ \t\r\n])[ \t]+$`);
              
              if (regex.test(line)) {
                  codeLocation = {
                      file: fileName,
                      startLine: lineNum,
                      /*Add one because first match group in the regex catches the last non-whitespace character */ 
                      startColumn: regex.lastIndex + 1
                  }
                  codeLocations.push(codeLocation)
          
              }
              
            });
        
          await once(rl, 'close')
          return codeLocations

          } catch (err) {
            throw new Error(`Cannot read file ${fileName}.`)
  
          }
        
    }




    

}