import { ExplorerNode, Common, TodoItemExplorerNode } from "../internal";
import { TreeItem } from "vscode";

export class FileExplorerNode extends ExplorerNode<TodoItemExplorerNode> {
    public toTreeItem(): TreeItem {
        const base = super.toTreeItem();
        const folders = Common.getRelevantFolders();
        base.tooltip = base.label;
        if (folders) {
            let shortnedLabel = base.label;
            for (const folder of folders) {
                shortnedLabel = shortnedLabel.replace(folder, '');
            }
            base.label = shortnedLabel;
        }
        return base;
    }

    public getOrderedChildren(){
        return this.children.sort((a, b) => a.todoItem.lineStart - b.todoItem.lineStart);
    }
}