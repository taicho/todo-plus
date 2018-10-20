import * as fs from 'fs';
import { TodoItem as TodoItemInterface } from './interfaces/todoItem';
import * as vscode from 'vscode';

export class TodoItem implements TodoItemInterface {
    public line: number = 0;
    public position: number = 0;
    public fileUri: string = '';
    public text: string = '';
    public created?: string;
    public updated?: string;

    public static fromJson(data: any) {
        return Object.assign(new TodoItem(), data);
    }

    public getFilePath() {
        return this.fileUri.replace('file://', '');
    }

    public toString() {
        const propsJson = this.propsToString();
        const spacing = Array(this.position).fill(undefined).join(' ');
        const text = this.text.replace(/\n/g,'\\n');
        return `${spacing}// TODO${!propsJson ? '' : `(${propsJson})`}: ${text}`;
    }

    public propsToString() {
        const props = { created: this.created, updated: this.updated };
        const propsJson = JSON.stringify(props);
        return propsJson === '{}' ? '' : propsJson;
    }

    public async remove() {
        const filePath = this.getFilePath();
        let textDocument = vscode.workspace.textDocuments.find(x => x.fileName === filePath);
        if (!textDocument) {
            textDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
        }
        const edit = new vscode.WorkspaceEdit();
        const range = textDocument.lineAt(this.line).rangeIncludingLineBreak;
        edit.delete(vscode.Uri.file(filePath), range);
        vscode.workspace.applyEdit(edit);
    }

    public update() {
        const filePath = this.getFilePath();
        const textDocument = vscode.workspace.textDocuments.find(x => x.fileName === filePath);
        const newLine = this.toString();
        if (textDocument) {
            const edit = new vscode.WorkspaceEdit();
            const range = textDocument.lineAt(this.line).range;
            edit.replace(vscode.Uri.file(filePath), range, newLine);
            vscode.workspace.applyEdit(edit);
        } else {
            const text = fs.readFileSync(filePath, 'utf-8');
            const lines = text.split('\n');
            lines.splice(this.line, 1, newLine);
            fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
        }
    }

    public restore() {
        const filePath = this.getFilePath();
        const textDocument = vscode.workspace.textDocuments.find(x => x.fileName === filePath);
        const newLine = this.toString();
        if (textDocument) {
            const edit = new vscode.WorkspaceEdit();
            const range = textDocument.lineAt(this.line).range;
            edit.insert(vscode.Uri.file(filePath), range.start, newLine + '\n');
            vscode.workspace.applyEdit(edit);
        } else {
            const text = fs.readFileSync(filePath, 'utf-8');
            const lines = text.split('\n');
            lines.splice(this.line, 1, newLine, lines[this.line]);
            fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
        }
    }
}