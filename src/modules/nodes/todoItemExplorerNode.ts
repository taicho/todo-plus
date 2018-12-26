import { TodoItem, ExplorerNode } from "../internal";
import { TreeItem } from "vscode";

export class TodoItemExplorerNode extends ExplorerNode {
    public todoItem?: TodoItem;
    
    public toTreeItem(): TreeItem {
        const base = super.toTreeItem();
        base.contextValue = this.isCompleted ? `${base.contextValue}.completed` : base.contextValue;
        base.command = this.isCompleted ? undefined : { command: 'todoPlusExplorer.gotoFile', title: 'Goto File', arguments: [{ item: this, }] };
        return base;
    }
}