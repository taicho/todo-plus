'use strict';
import * as vscode from 'vscode';
import { TodoPlusExplorer, TodoWriter, TodoPlusConfig, LanguageProvider, TodoCodeLensProvider, ExplorerNode, TodoItem, TodoItemExplorerNode } from './modules/internal';
let explorer: TodoPlusExplorer;


export async function activate(context: vscode.ExtensionContext) {
    const folder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : undefined;
    if (folder) {
        const path = folder.uri.path;
        TodoPlusConfig.initialize(path);
    }
    await LanguageProvider.initialize();
    explorer = new TodoPlusExplorer(context);
    await explorer.initialize();
    TodoWriter.initializeDecorators(context);
    vscode.workspace.onDidChangeTextDocument(onDocumentChanged, null, context.subscriptions);
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('todoPlusExplorer.gotoTodoNode', (editor, edit) => {
        explorer.revealNode(editor.document.fileName, editor.selection.active.line);
    }));
    const codeLensProvider = new TodoCodeLensProvider(explorer);
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ scheme: 'file' }, codeLensProvider));
    vscode.commands.registerCommand('todoCodeLensProvider.gotoTodoNode', (node: TodoItemExplorerNode) => {
        explorer.revealNode(node.todoItem.fileUri, node.todoItem.todoLineIndex);
    });
    vscode.commands.registerCommand('todoCodeLensProvider.convertToTodo', async (node: ExplorerNode) => {
        let todoItem = node.getTodoItem();
        todoItem = TodoItem.fromObject(todoItem, true);
        await TodoPlusConfig.syncTodos(todoItem);
        await todoItem.updateSource();
        codeLensProvider.onDidChangeCodeLensesEmit.fire();
    });
    explorer.provider.onDidChangeTreeData(() => {
        codeLensProvider.onDidChangeCodeLensesEmit.fire();
    });

}

let documentTimers = new Map<string, NodeJS.Timer>();
async function onDocumentChanged(e: vscode.TextDocumentChangeEvent) {
    const fileName = e.document.fileName;
    await TodoWriter.identifyLine(vscode.window.activeTextEditor, e.contentChanges[0]);
    if (documentTimers.has(fileName)) {
        clearTimeout(documentTimers.get(fileName));
        documentTimers.delete(fileName);
    }
    documentTimers.set(fileName, setTimeout(() => {
        explorer.updateFromDocument(fileName);
    }, 1000));
}

export function deactivate() {
}

export function getExplorer() {
    return explorer;
}