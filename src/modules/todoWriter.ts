import * as vscode from 'vscode';
import { TodoItem, LanguageProvider, TodoPlusConfig, Common } from './internal';
import { getExplorer } from '../extension';

export async function identifyLine(editor: vscode.TextEditor, changeEvent: vscode.TextDocumentContentChangeEvent) {
    if (changeEvent && editor && editor.document) {
        const editedLine = changeEvent.range.start.line;
        if (editedLine < editor.document.lineCount) {
            const currentLine = editor.document.lineAt(editedLine).text;
            const isColon = currentLine.slice(changeEvent.range.end.character, changeEvent.range.end.character + 1) === ':';
            if (isColon) {
                const isTodo = currentLine.slice(changeEvent.range.end.character - 4, changeEvent.range.end.character) === "TODO";
                if (isTodo) {
                    const languageInfo = LanguageProvider.getLanguageInfoFromFile(editor.document.fileName);
                    if (languageInfo) {
                        const match = hasStringReverse(editor.document.getText(new vscode.Range(0, 0, changeEvent.range.end.line, changeEvent.range.end.character)), languageInfo.lineComment, languageInfo.blockComment[0]);
                        if (match) {
                            const tempItem = new TodoItem(true);
                            tempItem.fileUri = editor.document.uri.path;
                            const output = tempItem.propsToString();
                            await TodoPlusConfig.syncTodos(tempItem);
                            await editor.edit((eb) => {
                                eb.insert(new vscode.Position(changeEvent.range.start.line, currentLine.indexOf('TODO') + 4), `(${output})`);
                            });
                        }
                    }

                }
            }
        }
    }
}

function hasStringReverse(text: string, ...searches: string[]) {
    const lines = text.split('\n').reverse();
    for (const line of lines) {
        const lineTrimmed = line.trim();
        if (lineTrimmed === 'TODO') {
            continue;
        }
        if (lineTrimmed) {
            return searches.some(search => lineTrimmed.indexOf(search) >= 0);
        }
    }
    return false;
}


export const decoration = vscode.window.createTextEditorDecorationType({
    color: 'white',
    fontWeight: 'bold',
    backgroundColor: 'green',
    overviewRulerColor: 'rgba(0,255,0,0.75)',
    overviewRulerLane: vscode.OverviewRulerLane.Right
});

let activeEditor: vscode.TextEditor;
export function initializeDecorators(context: vscode.ExtensionContext) {
    activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        triggerUpdateDecorations();
    }
    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

}
let timeout: any;
function triggerUpdateDecorations() {
    if (timeout) {
        clearTimeout(timeout);
    }
    timeout = setTimeout(updateDecorations, 500);
}

function updateDecorations() {
    if (!activeEditor) {
        return;
    }
    const regEx = /TODO(?:\([ \t\S]*\))?:/g;
    const text = activeEditor.document.getText();
    const filePath = activeEditor.document.fileName;
    const decoratorOptions: vscode.DecorationOptions[] = [];
    let match;
    while (match = regEx.exec(text)) {
        const startPos = activeEditor.document.positionAt(match.index);
        const endPos = activeEditor.document.positionAt(match.index + match[0].length);
        const todoItem = getExplorer().provider.getTodoItemByLine(filePath, startPos.line);
        let hoverText = undefined;
        if (todoItem && todoItem.id) {
            hoverText = `Created: ${Common.getFormattedDateTime(new Date(todoItem.created))}, Updated: ${Common.getFormattedDateTime(new Date(todoItem.updated))}`;
        }
        const decoration: vscode.DecorationOptions = {
            range: new vscode.Range(startPos, endPos),
            hoverMessage: hoverText,
        };
        decoratorOptions.push(decoration);
    }
    activeEditor.setDecorations(decoration, decoratorOptions);
}