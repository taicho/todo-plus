import * as vscode from 'vscode';
import * as path from 'path';
import { Message } from './interfaces/Message';
import * as fs from 'fs';
import { TodoItem } from './todoItem';
import { log } from './logging';

const webViewPath = 'webView';

export class TodoPanel {
    /**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
    public static currentPanel: TodoPanel | undefined;

    public static readonly viewType = 'todoPanel';

    private readonly _panel: vscode.WebviewPanel;
    private _baseHtml: string;
    private readonly _extensionPath: string;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionPath: string) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        // If we already have a panel, show it.
        if (TodoPanel.currentPanel) {
            TodoPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(TodoPanel.viewType, "Todo Plus", column || vscode.ViewColumn.One, {
            // Enable javascript in the webview
            enableScripts: true,
            retainContextWhenHidden: true,
            // And restric the webview to only loading content from our extension's `media` directory.
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
        extensionPath: string
    ) {
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
        // Clean up our resources
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
}

function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}