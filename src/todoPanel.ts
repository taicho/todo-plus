import * as vscode from 'vscode';
import * as path from 'path';
import { Message } from './interfaces/Message';
import * as fs from 'fs';
import { TodoItem } from './todoItem';
import { log } from './logging';
import ignore from 'ignore';

const webViewPath = 'webView';

export class TodoPanel {
    public static currentPanel: TodoPanel | undefined;
    public static readonly viewType = 'todoPanel';
    private readonly _panel: vscode.WebviewPanel;
    private _baseHtml: string;
    private readonly _extensionPath: string;
    private _disposables: vscode.Disposable[] = [];
    private fileTypes: string[];
    private trackedFiles: Set<string> = new Set();
    private pendingChanges : Map<string,TodoItem[]> = new Map();

    public static createOrShow(extensionPath: string) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
        if (TodoPanel.currentPanel) {
            TodoPanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel(TodoPanel.viewType, "Todo Plus", column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(extensionPath, webViewPath))
            ]
        });
        TodoPanel.currentPanel = new TodoPanel(panel, extensionPath);
    }

    public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
        TodoPanel.currentPanel = new TodoPanel(panel, extensionPath);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionPath: string,
        fileTypes = ['ts', 'js']
    ) {
        this.fileTypes = fileTypes;
        this._baseHtml = '';
        this._panel = panel;
        this._extensionPath = extensionPath;

        // Set the webview's initial html content 
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content based on view changes
        this._panel.onDidChangeViewState(e => {
            if (this._panel.visible) {
                this._update();
            }
        }, null, this._disposables);
        // Handle messages from the webview        
        this._panel.webview.onDidReceiveMessage(async (message: Message<any>) => {
            log(`Message Received: ${JSON.stringify(message, null, 4)}`);
            switch (message.command) {
                case 'delete':
                    this.removeTodo(TodoItem.fromJson(message.data));
                    return;
                case 'update':
                    this.updateTodo(TodoItem.fromJson(message.data));
                    return;
                case 'goto':
                    this.gotoFile(TodoItem.fromJson(message.data));
                    return;
            }
        }, null, this._disposables);
        vscode.workspace.onDidChangeTextDocument(this.onDocumentChanged, this, this._disposables);
        vscode.workspace.onDidOpenTextDocument(this.onDocumentOpened, this, this._disposables);

    }

    private onDocumentChanged = async (e: vscode.TextDocumentChangeEvent) => {
        const filePath = e.document.fileName;
        if (this.trackedFiles.has(filePath)) {
            const todos = await this.getTodosFromFile(filePath);
            if(!this._panel.visible){
                this.pendingChanges.set(filePath,todos);
            } else {
                this.load(todos);
            }
        }
    }

    private onDocumentOpened = async (e: vscode.TextDocument) => {
        const filePath = e.fileName;
        if (this.trackedFiles.has(filePath)) {
            const todos = await this.getTodosFromFile(filePath);
            if(!this._panel.visible){
                this.pendingChanges.set(filePath,todos);
            } else {
                this.load(todos);
            }
        }
    }

    private gotoFile(item: TodoItem) {
        const range = new vscode.Range(item.line || 0, 0, item.line || 0, 0);
        vscode.window.showTextDocument(vscode.Uri.file(item.fileUri), { selection: range });
    }

    private removeTodo(item: TodoItem) {
        item.remove();
    }

    private updateTodo(item: TodoItem) {
        item.update();
    }

    public dispose() {
        TodoPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    public load(data: any[]) {
        this._panel.webview.postMessage({
            command: 'load',
            data
        });
    }

    private _update() {
        if (!this._panel.webview.html) {
            this._panel.title = 'Todo Plus';
            this._panel.webview.html = this._getHtmlForWebview();
        }
        if (this.pendingChanges.size) {
            const changes = ([] as any[]).concat(...Array.from(this.pendingChanges.values()));
            this.pendingChanges.clear();
            // this.pendingChanges = [];
            this.load(changes);
        }
        // const z = 1 + 2;
        // Vary the webview's content based on where it is located in the editor.
        // switch (this._panel.viewColumn) {
        //     case vscode.ViewColumn.Two:
        //         this._updateForCat('Compiling Cat');
        //         return;

        //     case vscode.ViewColumn.Three:
        //         this._updateForCat('Testing Cat');
        //         return;

        //     case vscode.ViewColumn.One:
        //     default:
        //         this._updateForCat('Coding Cat');
        //         return;
        // }
    }


    private getBaseHtml() {
        if (!this._baseHtml) {
            this._baseHtml = fs.readFileSync(path.join(this._extensionPath, webViewPath, 'todoPanel.html'), 'utf-8');
        }
        return this._baseHtml;
    }

    private _getHtmlForWebview() {
        // Local path to main script run in the webview
        const resourcePath = path.join(this._extensionPath, webViewPath);
        const scriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, webViewPath, 'index.js'));
        // And the uri we use to load this script in the webview
        const scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });
        // Use a nonce to whitelist which scripts can be run
        const nonce = getNonce();
        let html = this.getBaseHtml();
        html = html.replace(/\$\{resourcePath\}/g, vscode.Uri.file(resourcePath).with({ scheme: 'vscode-resource' }).toString());
        html = html.replace(/\$\{nonce\}/g, nonce);
        html = html.replace(/\$\{scriptUri\}/g, scriptUri.toString());
        return html;
    }

    initialize() {
        const folders = vscode.workspace.workspaceFolders;
        if (folders) {
            for (const folder of folders) {
                const ig = ignore();
                ig.add('.git');
                ig.add('.vscode');
                const folderPath = folder.uri.with({ scheme: '' }).toString();
                this.processDirectory(folderPath, folderPath, ig);
            }
        }
    }

    async isDirectory(path: string) {
        return new Promise<boolean>((resolve) => {
            fs.lstat(path, (err, stats) => {
                resolve(stats.isDirectory());
            });
        });
    }

    processDirectory(rootPath: string, directoryPath: string, ig: any) {
        fs.readdir(directoryPath, async (err, files) => {
            let promise: Promise<void>;
            if (files.indexOf('.gitignore') > -1) {
                promise = this.processGitIgnore(directoryPath, path.join(directoryPath, '.gitignore'), ig);
            } else {
                promise = Promise.resolve();
            }
            await promise;
            for (const file of files) {
                const filePath = path.join(directoryPath, file);
                const relativePath = path.relative(rootPath, filePath);
                if (!ig.ignores(relativePath)) {
                    const directory = await this.isDirectory(filePath);
                    if (directory) {
                        if (!ig.ignores(`${relativePath}/`)) {
                            this.processDirectory(rootPath, filePath, ig);
                        }
                    }
                    else {
                        const validFile = this.fileTypes.some((s => {
                            return filePath.match(new RegExp(`${s}$`, 'i')) !== null;
                        }));
                        if (validFile) {
                            this.trackedFiles.add(filePath);
                            const todos = await this.getTodosFromFile(filePath);
                            this.load(todos);
                            // fs.readFile(filePath, 'utf-8', (err, text) => {
                            //     this.load(this.getTodosFromText(filePath, text));
                            // });
                        }
                    }
                }
            }
        });
    }

    async processGitIgnore(directoryPath: string, ignorePath: string, ignore: any) {
        return new Promise<void>((resolve) => {
            fs.readFile(ignorePath, 'utf-8', (err, data) => {
                ignore.add(data);
                resolve();
            });
        });
    }

    async getTodosFromFile(filePath: string): Promise<TodoItem[]> {
        return this.getTodosFromText(filePath, await this.getFileTextFromDiskOrWorkspace(filePath));
    }

    async getFileTextFromDiskOrWorkspace(filePath: string): Promise<string> {
        const textDocument = vscode.workspace.textDocuments.find(x => x.fileName === filePath);
        if (textDocument) {
            return textDocument.getText();
        }
        return new Promise<string>((resolve) => {
            fs.readFile(filePath, 'utf-8', (err, text) => {
                resolve(text);
            });
        });
    }

    getTodosFromText(filePath: string, fileText: string) {
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
}

function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}