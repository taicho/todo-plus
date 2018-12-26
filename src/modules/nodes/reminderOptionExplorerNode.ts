import { OptionExplorerNode } from "../internal";
import { TreeItem } from "vscode";

export class ReminderOptionExplorerNode extends OptionExplorerNode {
    public optionName?: string;

    public toTreeItem(): TreeItem {
        const base = super.toTreeItem();        
        base.tooltip = 'Toggle reminder on project load';
        return base;
    }
}