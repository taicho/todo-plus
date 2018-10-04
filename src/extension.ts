'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TodoPanel } from './todoPanel';
import { TodoItem } from './todoItem';
import * as fs from 'fs';
import * as path from 'path';
import ignore from 'ignore';
import {log} from './logging';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    let currenEditor: vscode.TextEditor = vscode.window.activeTextEditor as any;
    vscode.window.onDidChangeActiveTextEditor((e) => {
        currenEditor = e as any;
        log(e);
    }, null, context.subscriptions);
    vscode.workspace.onDidChangeTextDocument((e) => {
        identifyLine(currenEditor, e.contentChanges[0]);
    }, null, context.subscriptions);
    // Use the console to output diagnostic information (log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    log('Congratulations, your extension "todo-plus" is now active!');
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.todoPlus', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        TodoPanel.createOrShow(context.extensionPath);
        if (TodoPanel.currentPanel) {
            const panel = TodoPanel.currentPanel;
            process(panel);
        }
        vscode.window.showInformationMessage('Hello World!');
    });

    context.subscriptions.push(disposable);
}

function process(panel: TodoPanel) {
    const folders = vscode.workspace.workspaceFolders;
    if (folders) {
        for (const folder of folders) {
            const ig = ignore();
            ig.add('.git');
            ig.add('.vscode');
            const folderPath = folder.uri.with({ scheme: '' }).toString();
            processDir(panel, folderPath, folderPath, ['.ts', '.js'], (file) => {
            }, ig);
        }
    }
}

async function isDirectory(path: string) {
    return new Promise<boolean>((resolve) => {
        fs.lstat(path, (err, stats) => {
            resolve(stats.isDirectory());
        });
    });
}

function processDir(panel: TodoPanel, rootPath: string, directoryPath: string, fileTypes: string[], func: (fileName: string) => void, ig: any) {
    fs.readdir(directoryPath, async (err, files) => {
        let promise: Promise<void>;
        if (files.indexOf('.gitignore') > -1) {
            promise = processGitIgnore(directoryPath, path.join(directoryPath, '.gitignore'), ig);
            //promise = Promise.resolve();
        } else {
            promise = Promise.resolve();
        }
        await promise;
        for (const file of files) {
            const filePath = path.join(directoryPath, file);
            const relativePath = path.relative(rootPath, filePath);
            if (!ig.ignores(relativePath)) {
                const directory = await isDirectory(filePath);
                if (directory) {
                    if (!ig.ignores(`${relativePath}/`)) {
                        processDir(panel, rootPath, filePath, fileTypes, func, ig);
                    }
                }
                else {
                    const validFile = fileTypes.some((s => {
                        return filePath.match(new RegExp(`${s}$`, 'i')) !== null;
                    }));
                    if (validFile) {
                        fs.readFile(filePath, 'utf-8', (err, text) => {
                            panel.load(getTodosFromText(filePath, text));
                        });
                    }
                }
            }
        }
    });
}

async function processGitIgnore(directoryPath: string, ignorePath: string, ignore: any) {
    return new Promise<void>((resolve) => {
        fs.readFile(ignorePath, 'utf-8', (err, data) => {
            ignore.add(data);
            resolve();
        });
    });
}

function getTodosFromText(filePath: string, fileText: string) {
    const todos = [];
    const fileSplit = fileText.split('\n');
    for (let i = 0; i < fileSplit.length; i++) {
        let line = fileSplit[i];
        let match = line.match(/\/\/\s*TODO(\(.*\))?:(.*)/);
        if (match) {
            let props = match[1];
            let text = match[2];
            if (text) {
                let json = null;
                if (props) {
                    json = JSON.parse(props.slice(1, props.length - 1));
                }
                todos.push(Object.assign({}, {
                    line: i,
                    fileUri: filePath.toString(),
                    text
                }, json));
            }
        }
    }
    return todos;
}

function identifyLine(editor: vscode.TextEditor, changeEvent: vscode.TextDocumentContentChangeEvent) {
    if (changeEvent) {
        const currentLine = editor.document.lineAt(changeEvent.range.start.line).text;
        const isColon = currentLine.slice(changeEvent.range.end.character, changeEvent.range.end.character + 1) === ':';

        if (isColon) {
            const isTodo = currentLine.slice(changeEvent.range.end.character - 4, changeEvent.range.end.character) === "TODO";
            if (isTodo) {
                const match = currentLine.match(/\/\/\s*TODO/);
                if (match) {
                    editor.edit((eb) => {
                        const tempItem = new TodoItem();
                        tempItem.created = (new Date()).toJSON();
                        const output = tempItem.propsToString();
                        eb.insert(new vscode.Position(changeEvent.range.start.line, currentLine.indexOf('TODO') + 4), `(${output})`);
                    });
                }
            }
            log(isTodo);
        }
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}