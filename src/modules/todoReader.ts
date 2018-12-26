import { TodoItem, Common } from "./internal";
import { CharacterPair } from "../interfaces/characterPair";

const singleLineBase = `{commentPrefix}\\s*TODO(\\(.*\\))?:(.*)`;
const multiLineBase = `{commentPrefix}\\s*TODO(\\([\\s\\S]*\\))?:([\\s\\S]*?){commentSuffix}`;
export class TodoReader {
    public read(filePath: string, text: string, lineComment?: string, blockComment?: CharacterPair): TodoItem[] {
        let singleLineRegex: RegExp;
        let multiLineRegex: RegExp;
        if (!lineComment && (!blockComment || !blockComment.length)) {
            throw new Error('lineComment or blockComment must be provided.');
        }
        if (lineComment) {
            lineComment = Common.escapeRegExp(lineComment);
            singleLineRegex = new RegExp(singleLineBase.replace('{commentPrefix}', lineComment), 'm');
        }
        if (blockComment && blockComment.length === 2) {
            blockComment = [blockComment[0],blockComment[1]];
            blockComment[0] = Common.escapeRegExp(blockComment[0]);
            blockComment[1] = Common.escapeRegExp(blockComment[1]);
            multiLineRegex = new RegExp(multiLineBase.replace('{commentPrefix}', blockComment[0]).replace('{commentSuffix}', blockComment[1]), 'm');
        }
        const items: TodoItem[] = [];
        if (text) {
            if (singleLineRegex || multiLineRegex) {
                if(text.indexOf('TODO') < 0){
                    return items;
                }
                const lines = text.split('\n');
                if (lines && lines.length) {
                    let readLines = '';
                    let lineIndex = 0;
                    let commentOpen = false;
                    for (const line of lines) {
                        readLines += line + '\n';
                        let candidate = false;
                        if(lineComment && readLines.match(lineComment)){
                            candidate = true;
                        }
                        if(!candidate && readLines.match(blockComment[0])){
                            commentOpen = true;
                        }
                        if(!candidate && commentOpen && readLines.match(blockComment[1])){
                            commentOpen = false;
                            candidate = true;
                        }
                        if (candidate) {
                            const todoItem = TodoItem.fromText(
                                filePath,
                                readLines,
                                singleLineRegex,
                                multiLineRegex,
                                lineIndex);
                            if (todoItem) {
                                items.push(todoItem);                                
                            }
                            readLines = '';
                        } else if(!commentOpen) {
                            readLines = '';
                        }
                        lineIndex++;
                    }
                }
            }
        }
        return items;
    }
}