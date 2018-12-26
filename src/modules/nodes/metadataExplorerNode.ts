import { ExplorerNode } from "../internal";
import { TreeItem, TreeItemCollapsibleState } from "vscode";

export class MetadataExplorerNode extends ExplorerNode {
    public metadataIndex?: number;

    public toTreeItem(): TreeItem {
        const base = super.toTreeItem();        
        base.collapsibleState = TreeItemCollapsibleState.None;
        return base;
    }
}