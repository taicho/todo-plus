import { TodoItem } from '../interfaces/todoItem';
import * as React from 'react';
import { TodoLine } from './todoLine';
import { vscode } from '../utils';
export interface Props {
    todoItems: TodoItem[];
    fileUri: string;
    onTodoMarkClicked?: (item: TodoItem) => void;
}

export class TodoGroup extends React.Component<Props, any> {
    public static defaultProps = {
        onTodoMarkClicked: () => { },
    };

    render() {
        return <div className="todoList">
            <div className="header" onClick={this.onHeaderClicked}>{this.props.fileUri}</div>
            {this.props.todoItems.map(t => <TodoLine onTodoMarkClicked={(item) => { this.props.onTodoMarkClicked(item); }} key={t.line} todoItem={t} onTodoItemTextChanged={this.onTodoItemTextChanged} />)}
        </div>;
    }

    onTodoItemTextChanged = (todoItem: TodoItem, text: string) => {
        vscode.postMessage({
            command: 'update',
            data: Object.assign({}, todoItem, { text }),
        });
    }

    onHeaderClicked = () => {
        vscode.postMessage({
            command: 'goto',
            data: { fileUri: this.props.fileUri },
        });
    }
}