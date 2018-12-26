import { ExplorerNode } from "../internal";
import { TreeItem, TreeItemCollapsibleState } from "vscode";

export class GroupExplorerNode extends ExplorerNode {
    public toTreeItem(): TreeItem {
        const base = super.toTreeItem();        
        base.collapsibleState = TreeItemCollapsibleState.Collapsed;
        return base;
    }

    public getOrderedChildren(){
        return this.children.sort((a, b) => a.label.localeCompare(b.label));
    }
}