import { TodoItem, Common, FileExplorerNode, TodoItemExplorerNode, InformationExplorerNode, LineExplorerNode, MetadataExplorerNode, ReminderOptionExplorerNode } from "../internal";
import { TreeItem, TreeItemCollapsibleState } from "vscode";

export abstract class ExplorerNode<TChildren extends ExplorerNode<any> = any> {
    label: string;
    parent?: ExplorerNode;
    children: TChildren[] = [];
    isCompleted?: boolean;

    static fromPath(filePath: string) {
        const node = new FileExplorerNode();
        node.label = filePath;
        return node;
    }

    static fromTodoItem(parentNode: ExplorerNode, todoItem: TodoItem, addToParent = true) {
        const node = new TodoItemExplorerNode();
        node.label = `Line ${todoItem.todoLineIndex + 1}: ${todoItem.text.trim()}`;
        node.todoItem = todoItem;
        const metadataNode = new InformationExplorerNode();
        metadataNode.label = 'Metadata';
        const textSplit = (todoItem.text || '').trim().split('\n');
        if (textSplit.length > 1) {
            textSplit.splice(0, 1);
            let i = 1;
            for (const line of textSplit) {
                const createdNode = new LineExplorerNode();
                const newIndex = todoItem.todoLineIndex + i++;
                createdNode.lineIndex = newIndex;
                createdNode.label = `Line ${newIndex + 1}: ${line.trim()}`;
                createdNode.parent = node;
                node.children.push(createdNode);
            }
        }
        if (todoItem.created) {
            const createdNode = new InformationExplorerNode();
            const date = new Date(todoItem.created);
            createdNode.label = `Created: ${Common.getFormattedDateTime(date)}`;
            node.addChild(createdNode);
        }
        if (todoItem.updated) {
            const createdNode = new InformationExplorerNode();
            const date = new Date(todoItem.updated);
            createdNode.label = `Updated: ${Common.getFormattedDateTime(date)}`;
            node.addChild(createdNode);
        }
        const createdNode = new ReminderOptionExplorerNode();
        createdNode.optionName = 'hasReminder';
        createdNode.label = `Reminder: ${todoItem.hasReminder ? 'On' : 'Off'}`;
        node.addChild(createdNode);
        if (todoItem.customMetadata) {
            for (let i = 0; i < todoItem.customMetadata.length; i++) {
                const item = todoItem.customMetadata[i];
                const dataNode = new MetadataExplorerNode();
                dataNode.label = `${item[0]}: ${item[1]}`;
                dataNode.metadataIndex = i;
                metadataNode.addChild(dataNode);
            }
        }
        if (metadataNode.children.length) {
            node.addChild(metadataNode);
        }
        if (addToParent) {
            parentNode.addChild(node);
        }
        return node;
    }

    public toTreeItem(): TreeItem {
        const base: TreeItem = {};        
        base.contextValue = this.constructor.name;
        base.label = this.label;
        base.collapsibleState = this.children.length ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None;
        return base;
    }

    remove() {
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }

    replaceWith(node : ExplorerNode){
        const parent = this.parent;
        if(parent){
            this.remove();
            parent.addChild(node);
        }
    }

    getTodoItem(): TodoItem {
        if (this instanceof TodoItemExplorerNode) {
            if ((this as TodoItemExplorerNode).todoItem) {
                return (this as TodoItemExplorerNode).todoItem;
            }
        }
        if (this.parent) {
            return this.parent.getTodoItem();
        }
    }

    getTodoItemContainerNode(): TodoItemExplorerNode {
        if (this instanceof TodoItemExplorerNode) {
            if ((this as TodoItemExplorerNode).todoItem) {
                return this;
            }
        }
        if (this.parent) {
            return this.parent.getTodoItemContainerNode();
        }
    }

    addChild(node: TChildren) {
        this.children.push(node);
        node.parent = this;
    }

    removeChild(node: TChildren) {
        const index = this.children.indexOf(node);
        if (index > -1) {
            this.children.splice(index, 1);
            node.parent = null;
        }
    }

    removeAllChildren() {
        for(const child of this.children){
            child.parent = null;
        }
        this.children = [];
    }

    getOrderedChildren() {
        return this.children;
    }
}