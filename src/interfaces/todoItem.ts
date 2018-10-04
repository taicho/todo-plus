export interface TodoItem {
    line: number;
    fileUri: string;
    text: string;
    created?: string;
    updated?: string;
}