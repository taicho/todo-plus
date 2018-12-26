import { ExplorerNode } from "../internal";
import { TreeItem } from "vscode";

export class LineExplorerNode extends ExplorerNode {
    public lineIndex?: number;

    public toTreeItem(): TreeItem {
        const base = super.toTreeItem();
        base.command = this.isCompleted ? undefined : { command: 'todoPlusExplorer.gotoFile', title: 'Goto File', arguments: [{ item: this.parent, line: this.lineIndex }] };
        return base;
    }
}