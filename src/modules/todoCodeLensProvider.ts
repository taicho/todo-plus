import * as vscode from 'vscode';
import { TodoPlusExplorer, Common } from './internal';

export class TodoCodeLensProvider implements vscode.CodeLensProvider {
    onDidChangeCodeLensesEmit: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    onDidChangeCodeLenses: vscode.Event<void> = this.onDidChangeCodeLensesEmit.event;

    constructor(private explorer: TodoPlusExplorer) {
    }

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        const nodes = this.explorer.provider.getTodoNodesForDocument(document.fileName);
        if (nodes) {
            let lenses: vscode.CodeLens[] = [];
            for (const node of nodes) {
                const range = document.lineAt(node.todoItem.lineStart).range;
                if (!node.todoItem.canPersist) {
                    lenses.push(
                        {
                            range,
                            isResolved: true,
                            command: {
                                arguments: [node],
                                title: `Goto in Explorer`,
                                command: 'todoCodeLensProvider.gotoTodoNode',
                            }
                        },
                        {
                            range,  
                            isResolved: true,
                            command: {
                                arguments: [node],
                                title: `Convert to Todo Plus`,
                                command: 'todoCodeLensProvider.convertToTodo',
                            }
                        },
                    );
                }
                lenses.push(
                    {
                        range,
                        isResolved: true,
                        command: {
                            arguments: [node],
                            title: `Reminder: ${node.todoItem.hasReminder ? 'On' : 'Off'}`,
                            command: 'todoPlusExplorer.toggleReminder',
                            tooltip: 'Click to add/remove reminder.'
                        }
                    }
                );
                if (node.todoItem.canPersist) {
                    lenses.push(
                        {
                            range,
                            isResolved: true,
                            command: {
                                arguments: [node],
                                title: `Created: ${Common.getFormattedDateTime(new Date(node.todoItem.created))}`,
                                command: 'todoCodeLensProvider.gotoTodoNode',
                            }
                        },
                        {
                            range,
                            isResolved: true,
                            command: {
                                arguments: [node],
                                title: `Updated: ${Common.getFormattedDateTime(new Date(node.todoItem.updated))}`,
                                command: 'todoCodeLensProvider.gotoTodoNode',
                            }
                        }
                    );
                    if (node.todoItem.customMetadata) {
                        for (const metadataItem of node.todoItem.customMetadata) {
                            lenses.push({
                                range,
                                isResolved: true,
                                command: {
                                    arguments: [node],
                                    title: `${metadataItem[0]}: ${metadataItem[1]}`,
                                    command: 'todoCodeLensProvider.gotoTodoNode',
                                }
                            });
                        }
                    }
                }
            }
            return lenses;
        }
    }
    resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
        throw new Error("Method not implemented.");
    }

}