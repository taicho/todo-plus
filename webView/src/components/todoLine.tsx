import { TodoItem } from '../interfaces/todoItem';
import * as React from 'react';
import {vscode} from '../utils';
export interface Props {
    todoItem: TodoItem;
    onTodoItemTextChanged: (text: string) => void;
}


export class TodoLine extends React.Component<Props, any> {
    render() {

        let date = '';
        if (this.props.todoItem.created) {
            const parsedDate = new Date(this.props.todoItem.created);
            date = `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}/${parsedDate.getFullYear()} ${parsedDate.getHours() > 12 ? `${parsedDate.getHours() - 12}:${parsedDate.getMinutes()} PM` : `${parsedDate.getHours()}:${parsedDate.getMinutes()} AM`}`;
        }


        return <div className="todoItem">
            <div>
                <button>Mark</button>
            </div>
            <div className="text">
                <span onInput={this.onTodoItemTextChanged} contentEditable={true}>{this.props.todoItem.text}</span>
            </div>
            <div className="info">
                <span className="date">{date || 'No Date.'}</span>
                <span className="line" onClick={this.onLineClicked}>Line {this.props.todoItem.line + 1}</span>
            </div>
        </div>;
    }

    onLineClicked = () => {
        vscode.postMessage({
            command: 'goto',
            data: this.props.todoItem,
        });
    }

    onTodoItemTextChanged(e: any) {
        debugger;
    }
}