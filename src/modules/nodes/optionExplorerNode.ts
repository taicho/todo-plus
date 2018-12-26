import { ExplorerNode } from "../internal";
import { TreeItem } from "vscode";

export class OptionExplorerNode extends ExplorerNode {
    public optionName?: string;

    public toTreeItem(): TreeItem {
        const base = super.toTreeItem();        
        base.tooltip = 'Toggle option';
        return base;
    }
}