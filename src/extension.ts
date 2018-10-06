'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TodoPanel } from './todoPanel';
import { TodoItem } from './todoItem';
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
            panel.initialize();
        }
        vscode.window.showInformationMessage('Hello World!');
    });

    context.subscriptions.push(disposable);
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