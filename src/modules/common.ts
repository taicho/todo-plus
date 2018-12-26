import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import ignore from 'ignore';
import { TodoPlusSettings } from '../interfaces/todoPlusSettings';
import { LanguageProvider } from './internal';

export function getRelevantFolders(): string[] {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length) {
        return folders.map(f => f.uri.path);
    }
}

export async function getAllRelevantFiles(): Promise<string[]> {
    const folders = vscode.workspace.workspaceFolders;
    let relevantFiles: string[] = [];
    if (folders) {
        for (const folder of folders) {
            const ig = ignore();
            ig.add('.git');
            ig.add('.vscode');
            const folderPath = folder.uri.with({ scheme: '' }).toString();
            const files = await processDirectory(folderPath, folderPath, ig);
            relevantFiles = relevantFiles.concat(files);
        }
    } else {
        const files = vscode.workspace.textDocuments;
        if (files) {
            relevantFiles = relevantFiles.concat(
                files.filter(f => LanguageProvider.isFileSupported(f.fileName)).map(f => f.fileName));
        }
    }
    return relevantFiles;
}

export function getFormattedDateTime(date: Date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const hour = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
    const minutes = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes().toString();
    const amPM = date.getHours() >= 12 ? 'PM' : 'AM';
    return `${month}/${day}/${year} ${hour}:${minutes} ${amPM}`;
}

export function getEnvironmentSettings(): vscode.WorkspaceConfiguration & TodoPlusSettings {
    return vscode.workspace.getConfiguration('todoPlus') as vscode.WorkspaceConfiguration & TodoPlusSettings;
}

export function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

async function isDirectory(path: string) {
    return new Promise<boolean>((resolve) => {
        fs.lstat(path, (err, stats) => {
            resolve(stats.isDirectory());
        });
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

export async function getFileTextFromDiskOrWorkspace(filePath: string): Promise<string> {
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

export function gotoFile(filePath: string, lineIndex?: number) {
    const range = new vscode.Range(lineIndex || 0, 0, lineIndex || 0, 0);
    vscode.window.showTextDocument(vscode.Uri.file(filePath), { selection: range });
}

async function processDirectory(rootPath: string, directoryPath: string, ig: any) {
    return new Promise<string[]>((resolve) => {
        let relevantFiles: string[] = [];
        fs.readdir(directoryPath, async (err, files) => {
            let promise: Promise<void>;
            if (files.indexOf('.gitignore') > -1) {
                promise = processGitIgnore(directoryPath, path.join(directoryPath, '.gitignore'), ig);
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
                            const files = await processDirectory(rootPath, filePath, ig);
                            relevantFiles = relevantFiles.concat(files);
                        }
                    }
                    else {
                        const validFile = LanguageProvider.isFileSupported(filePath);
                        if (validFile) {
                            relevantFiles.push(filePath);
                        }
                    }
                }
            }
            resolve(relevantFiles);
        });
    });
}

export function regexEscape(str: string) {
    return str.split('').reduce((obj, curr) => { obj.push('\\'); obj.push(curr); return obj; }, []).join('');
}