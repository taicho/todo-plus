import { TreeDataProvider, EventEmitter, TreeItem, ProviderResult, Event } from "vscode";
import { ExplorerNode, TodoReader, Common, TodoPlusConfig, LanguageProvider, TodoItem, NotificationManager, ReminderType, FileExplorerNode, TodoItemExplorerNode, GroupExplorerNode, MetadataExplorerNode } from './internal';
import * as vscode from 'vscode';
import { ReminderInfo } from "../interfaces/reminderInfo";

export class TodoItemNodeProvider implements TreeDataProvider<ExplorerNode> {
    private nodes: Map<string, FileExplorerNode> = new Map();
    private completedNodes: Map<string, FileExplorerNode> = new Map();
    private reader = new TodoReader();
    private incompleteTreeItemNode: ExplorerNode;
    private completeTreeItemNode: ExplorerNode;
    private ignoreUpdates = false;
    constructor() {
        let languageExtensions = [];
        const languages = LanguageProvider.getLanguages();
        for (const language of languages) {
            for (const ext of language.extensions) {
                languageExtensions.push(ext);
            }
        }
        this.createGroups();
    }

    public async initialize() {
        await this.createNodes();
    }


    public getTodoItemByLine(filePath: string, lineIndex: number) {
        const node = this.getTodoNodeByLine(filePath, lineIndex);
        if (node) {
            return node.todoItem;
        }
    }

    public getTodoNodeByLine(filePath: string, lineIndex: number): TodoItemExplorerNode {
        const fileNode = this.nodes.get(filePath);
        if (fileNode) {
            const itemNode = (fileNode.children || []).find((f) => { return f.todoItem.todoLineIndex === lineIndex; });
            if (itemNode) {
                return itemNode;
            }
        }
    }

    public getTodoNodeById(filePath: string, id: string): TodoItemExplorerNode {
        const fileNode = this.nodes.get(filePath);
        if (fileNode) {
            const itemNode = (fileNode.children || []).find((f) => { return f.todoItem.id === id; });
            if (itemNode) {
                return itemNode;
            }
        }
    }

    public getTodoNodesForDocument(filePath: string) {
        const fileNode = this.nodes.get(filePath);
        if (fileNode) {
            return fileNode.children;
        }
    }

    private showNotification(todoItem: TodoItem, ensureExistance = false) {
        if (!ensureExistance || (ensureExistance && this.getTodoNodeById(todoItem.fileUri, todoItem.id))) {
            vscode.window.showInformationMessage(`Todo Reminder: ${todoItem.text}`, 'Goto', 'Goto & Turn Off', 'Turn Off').then(async (v) => {
                if (v) {
                    if (v.indexOf('Goto') > -1) {
                        todoItem.goto();
                    }
                    if (v.indexOf('Off') > -1) {
                        await this.removeReminder(todoItem);
                    }
                }
            });
        }
    }

    private prepareNotifications(todoItem: TodoItem, isStartup = false) {
        if (todoItem.id) {
            NotificationManager.removeNotification(todoItem.id);
            if (todoItem.metadata && todoItem.metadata.reminder) {
                const reminderData = todoItem.metadata.reminder;
                const currentDate = new Date();
                switch (reminderData.reminderType) {
                    case ReminderType.OnStartup:
                        if (isStartup) {
                            this.showNotification(todoItem);
                        }
                        break;
                    case ReminderType.Timer:
                        const preservedDate = new Date(reminderData.reminderStartDate);
                        const timerDiff = currentDate.getTime() - preservedDate.getTime();
                        if (timerDiff > reminderData.reminderValue) {
                            this.showNotification(todoItem);
                        } else {
                            const result = reminderData.reminderValue - timerDiff;
                            if (result > 0) {
                                NotificationManager.addNotification(todoItem.id, result, true, () => {
                                    this.showNotification(todoItem, true);
                                });
                            }
                        }
                        break;
                    case ReminderType.Interval:
                        if (reminderData.reminderValue > 0) {
                            NotificationManager.addNotification(todoItem.id, reminderData.reminderValue, false, () => {
                                this.showNotification(todoItem, true);
                            });
                        }
                        break;
                    case ReminderType.Date:
                        const reminderDateTime = new Date(reminderData.reminderValue);
                        const dateDiff = reminderDateTime.getTime() - currentDate.getTime();
                        if (dateDiff <= 0) {
                            this.showNotification(todoItem);
                        } else {
                            NotificationManager.addNotification(todoItem.id, dateDiff, true, () => {
                                this.showNotification(todoItem, true);
                            });
                        }
                        break;
                }
            }
        }
    }

    private async createNodes() {
        const files = await Common.getAllRelevantFiles();
        const rootNodes = new Map<string, FileExplorerNode>();
        for (const filePath of files) {
            const parentNode = ExplorerNode.fromPath(filePath);
            parentNode.parent = this.incompleteTreeItemNode;
            const text = await Common.getFileTextFromDiskOrWorkspace(filePath);
            const languageInfo = LanguageProvider.getLanguageInfoFromFile(filePath);
            if (languageInfo) {
                const todoItems = this.reader.read(filePath, text, languageInfo.lineComment, languageInfo.blockComment);
                if (todoItems && todoItems.length) {
                    await TodoPlusConfig.syncTodos(...todoItems);
                    for (const todoItem of todoItems) {
                        ExplorerNode.fromTodoItem(parentNode, todoItem);
                        if (todoItem.hasReminder) {
                            this.prepareNotifications(todoItem, true);
                        }
                    }
                    rootNodes.set(filePath, parentNode);
                }
            }
        }
        this.nodes = rootNodes;
        this.onDidChangeTreeDataEmit.fire();
    }

    private createGroups() {
        const incompleteNodes = new GroupExplorerNode();
        incompleteNodes.label = 'Incomplete';
        this.incompleteTreeItemNode = incompleteNodes;
        const completeNodes = new GroupExplorerNode();
        completeNodes.label = 'Completed';
        this.completeTreeItemNode = completeNodes;

    }

    onDidChangeTreeDataEmit: EventEmitter<ExplorerNode> = new EventEmitter();
    onDidChangeTreeData?: Event<ExplorerNode> = this.onDidChangeTreeDataEmit.event;

    getTreeItem(element: ExplorerNode): TreeItem | Thenable<TreeItem> {
        return element.toTreeItem();
    }
    getChildren(element?: ExplorerNode): ProviderResult<ExplorerNode[]> {
        if (element) {
            return element.getOrderedChildren();
        } else {
            this.incompleteTreeItemNode.children = Array.from(this.nodes.values());
            this.completeTreeItemNode.children = Array.from(this.completedNodes.values());
            return [this.incompleteTreeItemNode, this.completeTreeItemNode];
        }
    }
    getParent?(element: ExplorerNode): ProviderResult<ExplorerNode> {
        return element.parent;
    }

    public markCompleted(item: TodoItemExplorerNode, remove = true) {
        let fileNode = this.completedNodes.get(item.todoItem.fileUri);
        let hadNode = true;
        if (!fileNode) {
            hadNode = false;
            fileNode = ExplorerNode.fromPath(item.todoItem.fileUri);
            this.completeTreeItemNode.addChild(fileNode);
            this.completedNodes.set(item.todoItem.fileUri, fileNode);
        }
        item.remove();
        const newNode = ExplorerNode.fromTodoItem(fileNode, item.todoItem);
        newNode.isCompleted = true;
        if (hadNode) {
            this.onDidChangeTreeDataEmit.fire(fileNode);
        } else {
            this.onDidChangeTreeDataEmit.fire(this.completeTreeItemNode);
        }
        if (remove) {
            item.todoItem.remove();
        }
    }

    public restore(item: TodoItemExplorerNode) {
        const fileNode = item.parent;
        const groupNode = fileNode.parent;
        if (fileNode.children.length > 1) {
            item.parent.removeChild(item);
            this.onDidChangeTreeDataEmit.fire(fileNode);
        } else {
            this.completedNodes.delete(fileNode.label);
            groupNode.removeChild(fileNode);
            this.onDidChangeTreeDataEmit.fire(groupNode);
        }
        item.todoItem.restore();
    }

    public async updateTodoItemSource(todoItem: TodoItem) {
        this.ignoreUpdates = true;
        await todoItem.updateSource();
        this.ignoreUpdates = false;
    }

    public async addReminder(item: TodoItemExplorerNode, reminderInfo: ReminderInfo) {
        this.ensureItemPersistance(item.todoItem);
        item.todoItem.addReminder(reminderInfo);
        this.prepareNotifications(item.todoItem);
        await TodoPlusConfig.syncTodos(item.todoItem);
    }

    public async removeReminder(todoItem: TodoItem) {
        todoItem.removeReminder();
        await TodoPlusConfig.syncTodos(todoItem);
        await this.updateFromDocument(todoItem.getFilePath());
    }

    public async addMetadata(item: ExplorerNode, key: string, value: string) {
        let todoItem = item.getTodoItem();
        this.ensureItemPersistance(todoItem);
        todoItem.addCustomMetadata(key, value);
        const newTodoItemNode = ExplorerNode.fromTodoItem(item.parent, todoItem);
        item.remove();
        await TodoPlusConfig.syncTodos(todoItem);
        this.onDidChangeTreeDataEmit.fire(newTodoItemNode.parent);
    }

    public async removeMetadata(metadataItemNode: MetadataExplorerNode) {
        const container = metadataItemNode.getTodoItemContainerNode();
        const containerParent = container.parent;
        const todoItem = metadataItemNode.getTodoItem();
        todoItem.removeCustomMetadata(metadataItemNode.metadataIndex);
        ExplorerNode.fromTodoItem(containerParent, todoItem);
        container.remove();
        await TodoPlusConfig.syncTodos(todoItem);
        this.onDidChangeTreeDataEmit.fire(containerParent);
    }

    private async ensureItemPersistance(todoItem: TodoItem) {
        if (!todoItem.canPersist) {
            todoItem.makePersistable();
        }
        await this.updateTodoItemSource(todoItem);
    }

    public async toggleOption(item: ExplorerNode, optionName: string) {
        let todoItem = item.getTodoItem();
        await this.ensureItemPersistance(todoItem);
        const itemContainerNode = item.getTodoItemContainerNode();
        const parentNode = itemContainerNode.parent;
        itemContainerNode.parent.removeChild(itemContainerNode);
        todoItem[optionName] = !todoItem[optionName];
        ExplorerNode.fromTodoItem(parentNode, todoItem);
        await TodoPlusConfig.syncTodos(todoItem);
        this.onDidChangeTreeDataEmit.fire(parentNode);
    }

    public async updateFromDocument(filePath: string) {
        if (this.ignoreUpdates) {
            return;
        }
        const languageInfo = LanguageProvider.getLanguageInfoFromFile(filePath);
        if (languageInfo) {
            let fileNode = this.nodes.get(filePath);
            let nodeToUpdate = fileNode;
            if (!fileNode) {
                nodeToUpdate = this.incompleteTreeItemNode;
                fileNode = ExplorerNode.fromPath(filePath);
                nodeToUpdate.addChild(fileNode);
                this.nodes.set(filePath, fileNode);
            }
            const text = await Common.getFileTextFromDiskOrWorkspace(filePath);
            const todoItems = this.reader.read(filePath, text, languageInfo.lineComment, languageInfo.blockComment);
            const currentTodoItemNodeMap = fileNode.children.filter(c => !!c.todoItem.id)
                .reduce((obj, curr) => {
                    obj[curr.todoItem.id] = curr.todoItem;
                    return obj;
                }, {} as any);
            for (const todoItem of todoItems) {
                if (todoItem.id) {
                    let persistedChild = currentTodoItemNodeMap[todoItem.id];
                    if (persistedChild) {
                        if (persistedChild.text.trim() !== todoItem.text.trim()) {
                            todoItem.updated = (new Date()).getTime();
                        }
                    }
                }
            }
            await TodoPlusConfig.syncTodos(...todoItems);
            fileNode.children = [];
            for (const todoItem of todoItems) {
                ExplorerNode.fromTodoItem(fileNode, todoItem);
            }
            if (fileNode.children.length) {
                this.onDidChangeTreeDataEmit.fire(nodeToUpdate);
            } else {
                this.nodes.delete(fileNode.label);
                this.onDidChangeTreeDataEmit.fire(null);
            }
        }
    }
}