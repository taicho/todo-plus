import { TodoItemExplorerNode } from "../modules/internal";

export interface GotoFileCommand {
    item : TodoItemExplorerNode;
    line?: number;
}