import * as vscode from 'vscode';
import { TodoItemNodeProvider, ExplorerNode, TodoItemExplorerNode, OptionExplorerNode } from './internal';
import { GotoFileCommand } from '../interfaces/gotoFileCommand';
import { ReminderType } from './reminderType';
import * as ms from 'ms';

export class TodoPlusExplorer {

    public provider: TodoItemNodeProvider;
    public view: vscode.TreeView<ExplorerNode>;
    public lastNodeClicked: ExplorerNode;
    constructor(context: vscode.ExtensionContext) {
        this.provider = new TodoItemNodeProvider();
        // vscode.window.registerTreeDataProvider('todoPlusExplorer', this.provider);
        this.view = vscode.window.createTreeView('todoPlusExplorer', { treeDataProvider: this.provider });
        vscode.commands.registerCommand('todoPlusExplorer.gotoFile', (command: GotoFileCommand) => {
            const node = command.item;
            if (node === this.lastNodeClicked) {
                node.todoItem.goto(command.line);
                this.lastNodeClicked = null;
            } else {
                this.lastNodeClicked = node;
            }
        });
        vscode.commands.registerCommand('todoPlusExplorer.removeTodo', async (item: TodoItemExplorerNode) => {
            await item.todoItem.remove();
        });
        vscode.commands.registerCommand('todoPlusExplorer.markCompleted', async (item: TodoItemExplorerNode) => {
            this.provider.markCompleted(item);
        });
        vscode.commands.registerCommand('todoPlusExplorer.restore', async (item: TodoItemExplorerNode) => {
            this.provider.restore(item);
        });
        vscode.commands.registerCommand('todoPlusExplorer.toggleOption', async (item: OptionExplorerNode, optionName?: string) => {
            optionName = optionName || item.optionName;
            await this.provider.toggleOption(item, optionName);
        });

        vscode.commands.registerCommand('todoPlusExplorer.toggleReminder', async (item: ExplorerNode) => {
            const todoContainerNode = item.getTodoItemContainerNode();
            if (todoContainerNode.todoItem.hasReminder) {
                await this.provider.removeReminder(todoContainerNode.todoItem);
            } else {
                const result = await vscode.window.showQuickPick(['Startup', 'Timer', 'Interval', 'Date']);
                if (result) {
                    if (result === 'Startup') {
                        await this.provider.addReminder(todoContainerNode, { reminderType: ReminderType.OnStartup });
                    } else {
                        const reminderType = ReminderType[result];
                        if (reminderType === ReminderType.Date) {
                            const dateString = await vscode.window.showInputBox({
                                placeHolder:'Enter date in the following format "MM/DD/YYYY HH:MM AM/PM":',
                                validateInput: (input)=>{
                                    try {
                                        Date.parse(input);
                                    } catch {
                                        return 'Unable to parse date, check your formatting.';
                                    }
                                }
                            });
                            if(dateString){
                                const date = Date.parse(dateString);
                                await this.provider.addReminder(todoContainerNode,{
                                    reminderType,
                                    reminderValue: date,                                    
                                });
                            }
                        } else {
                            const value = await vscode.window.showInputBox({ placeHolder: 'Enter ms or zeitms (e.g. 1d)' });
                            if (value) {
                                const valueMs = ms(value);
                                if (valueMs) {
                                    await this.provider.addReminder(todoContainerNode, { reminderType, reminderStartDate: (new Date()).getTime(), reminderValue: valueMs });
                                }
                            }
                        }
                    }
                }
            }
        });

        vscode.commands.registerCommand('todoPlusExplorer.removeMetadata', async (item: ExplorerNode) => {
            this.provider.removeMetadata(item);
        });
        vscode.commands.registerCommand('todoPlusExplorer.addMetadata', async (item: ExplorerNode) => {
            const keyResult = await vscode.window.showInputBox({
                validateInput: (value) => {
                    if (!value || !value.trim()) {
                        return 'A value is required.';
                    }
                },
                prompt: 'Enter metadata name'
            });
            if (keyResult) {
                const valueResult = await vscode.window.showInputBox({
                    validateInput: (value) => {
                        if (!value || !value.trim()) {
                            return 'A value is required.';
                        }
                    },
                    prompt: 'Enter metadata value'
                });
                if (valueResult) {
                    this.provider.addMetadata(item, keyResult, valueResult);
                }
            }
        });
    }

    public async initialize() {
        await this.provider.initialize();
    }

    public async updateFromDocument(filePath: string) {
        await this.provider.updateFromDocument(filePath);
    }

    public revealNode(filePath: string, line: number) {
        const node = this.provider.getTodoNodeByLine(filePath, line);
        if (node) {
            this.view.reveal(node, { select: true, focus: true });
        } else {
            vscode.window.showErrorMessage('Unable to find todo item in explorer for selected line.');
        }
    }
}