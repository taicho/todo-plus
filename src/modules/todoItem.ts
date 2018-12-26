import * as vscode from 'vscode';
import * as shortid from 'shortid';
import { TodoMetadata } from '../interfaces/todoMetadata';
import { ReminderInfo } from '../interfaces/reminderInfo';
import { LanguageProvider, NotificationManager } from './internal';

export class TodoItem {
    public lineStart: number = 0;
    public lineEnd?: number;
    public lineOffset: number = 0;
    public start: number = 0;
    public end: number = 0;
    public fileUri: string = '';
    public text: string = '';
    public created?: number;
    public updated?: number;
    public customMetadata?: [string, string][];
    public id?: string;
    // public isSynced = false;
    public metadata: TodoMetadata;

    public addReminder(info: ReminderInfo) {
        this.ensureMetadata();
        this.removeReminder();
        this.metadata.reminder = info;
        this.onChange();
    }

    public get isSynced() {
        return !!this.updated;
    }

    private ensureMetadata() {
        this.metadata = this.metadata || {};
    }

    private ensureCustomMetadata() {
        this.customMetadata = this.customMetadata || [];
    }

    public removeReminder() {
        this.metadata.reminder = undefined;
        NotificationManager.removeNotification(this.id);
        this.onChange();
    }

    public get hasReminder() {
        return this.metadata && this.metadata.reminder;
    }

    public static fromObject(data: any, canPersist = false) {
        return Object.assign(new TodoItem(canPersist), data);
    }

    constructor(includeId = false) {
        if (includeId) {
            this.makePersistable();
        }
    }

    public makePersistable(override = false) {
        if (override || !this.id) {            
            this.id = shortid.generate();
            this.created = (new Date()).getTime();
            this.updated = (new Date()).getTime();
        }
    }

    public addCustomMetadata(key: string, value: string) {
        this.ensureCustomMetadata();      
        this.customMetadata.push([key, value]);
        this.onChange();
    }

    public removeCustomMetadata(index: number) {
        this.ensureCustomMetadata();
        const deleted = !!this.customMetadata.splice(index, 1);
        if (deleted) {
            this.updated = (new Date()).getTime();
        }
    }

    public get canPersist() {
        return this.created !== undefined &&
            this.updated !== undefined;
    }

    public getFilePath() {
        return this.fileUri.replace('file://', '');
    }

    public get todoLineIndex() {
        return this.lineStart + this.lineOffset;
    }

    public toString() {
        const languageInfo = LanguageProvider.getLanguageInfoFromFile(this.fileUri);
        const propsJson = this.propsToString();
        const spacing = '';
        const text = this.text;
        if (text.indexOf('\n') > -1) {
            return `${spacing}${languageInfo.blockComment[0]}\n    TODO${!propsJson ? '' : `(${propsJson})`}: ${text.trimLeft()}\n${languageInfo.blockComment[1]}`;
        } else {
            return `${spacing}${languageInfo.lineComment} TODO${!propsJson ? '' : `(${propsJson})`}: ${text.trimLeft()}`;
        }
    }

    public propsToString() {
        return this.id ? `{${this.id}}` : '';
    }

    public goto(lineIndex?: number) {
        const range = new vscode.Range(lineIndex || this.todoLineIndex || 0, 0, lineIndex || this.todoLineIndex || 0, 0);
        vscode.window.showTextDocument(vscode.Uri.file(this.fileUri), { selection: range });
    }

    public async remove() {
        const filePath = this.getFilePath();
        let textDocument = vscode.workspace.textDocuments.find(x => x.fileName === filePath);
        if (!textDocument) {
            textDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
        }
        const edit = new vscode.WorkspaceEdit();
        const start = new vscode.Position(this.lineStart, this.start);
        const end = new vscode.Position(this.lineEnd, this.end);
        const range = new vscode.Range(start, end);
        edit.delete(vscode.Uri.file(filePath), range);
        await vscode.workspace.applyEdit(edit);
    }

    public async updateSource() {
        const filePath = this.getFilePath();
        let textDocument = vscode.workspace.textDocuments.find(x => x.fileName === filePath);
        if (!textDocument) {
            textDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
        }
        const newLine = this.toString();
        if (textDocument) {
            const edit = new vscode.WorkspaceEdit();
            const start = new vscode.Position(this.lineStart, this.start);
            const end = new vscode.Position(this.lineEnd, this.end);
            const range = new vscode.Range(start, end);
            edit.replace(vscode.Uri.file(filePath), range, newLine);
            await vscode.workspace.applyEdit(edit);
        }
    }

    public async restore() {
        const filePath = this.getFilePath();
        let textDocument = vscode.workspace.textDocuments.find(x => x.fileName === filePath);
        const newLine = this.toString();
        if (!textDocument) {
            textDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
        }
        if (textDocument) {
            const edit = new vscode.WorkspaceEdit();
            const start = new vscode.Position(this.lineStart, this.start);
            const end = new vscode.Position(this.lineEnd, this.end);
            const range = new vscode.Range(start, end);
            edit.insert(vscode.Uri.file(filePath), range.start, newLine + '\n');
            await vscode.workspace.applyEdit(edit);
        }
    }

    public static fromText(
        filePath: string,
        text: string,
        singleLineRegex: RegExp,
        multiLineRegex: RegExp,
        lineIndexOffset: number = 0) {
        if (!text) {
            return null;
        }
        let readLines = text;
        let lineIndex = lineIndexOffset;
        let determinedLineIndex: number;
        let lineEnd: number;
        let lineOffset: number = 0;
        let commentText: string;
        let data: any;
        let match: RegExpMatchArray | null = null;
        let end = 0;
        if (singleLineRegex) {
            match = readLines.match(singleLineRegex);
            determinedLineIndex = lineIndex;
            lineEnd = lineIndex;
        }
        if (!match && multiLineRegex) {
            match = readLines.match(multiLineRegex);
            if (match) {
                const matchIndex = match.index;
                if (matchIndex !== undefined) {
                    const matchedText = match[0];
                    const lineCountMatch = matchedText.match(/\n/g);
                    if (lineCountMatch) {
                        const newLineCount = lineCountMatch.length;
                        const lineDifference = lineIndex - newLineCount;
                        determinedLineIndex = lineDifference;
                        const matchChars = matchedText.substring(0, matchedText.match(/todo/i).index).match(/\n/g);
                        lineOffset = matchChars ? matchChars.length : 0;
                        lineEnd = determinedLineIndex + lineCountMatch.length;
                    } else {
                        determinedLineIndex = lineIndex;
                        lineEnd = determinedLineIndex;
                    }
                }
            }
        }
        if (match) {
            commentText = match[2];
            data = TodoItem.parseProps(match[1]);
            let start = match.index;
            if (start) {
                const firstNewLineIndex = readLines.indexOf('\n');
                if (firstNewLineIndex > -1 && start > firstNewLineIndex) {
                    let counter = 0;
                    for (let i = 0; i < readLines.length; i++) {
                        const char = readLines[i];
                        if (i === match.index) {
                            start = match.index - (counter + 1);
                            break;
                        }
                        if (char === '\n') {
                            counter = i;
                        }
                    }
                }
            }
            let matchLines = match[0].split('\n');
            end = start + matchLines[matchLines.length - 1].length;
            readLines = '';
            const todoItem = new TodoItem();
            todoItem.text = commentText;
            todoItem.lineStart = determinedLineIndex;
            todoItem.lineEnd = lineEnd;
            todoItem.lineOffset = lineOffset;
            todoItem.start = start;
            todoItem.end = end;
            todoItem.fileUri = filePath;
            if (data) {
                Object.assign(todoItem, data);
            }
            return todoItem;
        }

    }

    private onChange() {
        this.updated = (new Date()).getTime();
    }

    public static parseProps(text: string) {
        if (text) {
            const id = text.replace(/\{|\}|\(|\)/g, '');
            if (!shortid.isValid(id)) {
                return {};
            }
            return { id };
        }
        return {};
    }
}