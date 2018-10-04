import { TodoItem } from '../interfaces/todoItem';
import * as React from 'react';
import { TodoLine } from './todoLine';
import {vscode} from '../utils';
export interface Props {
    todoItems: TodoItem[];
    fileUri: string;

}

export class TodoGroup extends React.Component<Props, any> {
    render() {
        return <div className="todoList">
            <div className="header" onClick={this.onHeaderClicked}>{this.props.fileUri}</div>
            {this.props.todoItems.map(t => <TodoLine key={t.line} todoItem={t} onTodoItemTextChanged={this.onTodoItemTextChanged} />)}
        </div>;
    }

    onTodoItemTextChanged = (text: string) => {

    }

    onHeaderClicked = () =>{
        vscode.postMessage({
            command: 'goto',
            data: {fileUri: this.props.fileUri},
        });
    };
}