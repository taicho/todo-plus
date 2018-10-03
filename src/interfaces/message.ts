export interface Message<TData> {
    command: string;
    data: TData;
}