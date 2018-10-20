import { TodoItem } from '../interfaces/todoItem';
import * as React from 'react';
import { vscode } from '../utils';
import { Editable } from './editable';
export interface Props {
    todoItem: TodoItem;
    onTodoItemTextChanged: (item: TodoItem, text: string) => void;
    onTodoMarkClicked?: (item: TodoItem) => void;
}

interface State {
    todoItem: TodoItem;
}


export class TodoLine extends React.Component<Props, State> {
    private timerId: any = 0;
    // private spanRef: React.RefObject<HTMLSpanElement>;

    constructor(p, c) {
        super(p, c);
        // this.spanRef = React.createRef();
        this.state = {
            todoItem: p.todoItem,
        };
    }

    componentWillReceiveProps(props) {
        this.setState({ todoItem: props.todoItem });
    }

    getFormattedDateTime(date : Date){
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const year = date.getFullYear();
        const hour = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
        const minutes = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes().toString();
        const amPM = date.getHours() >= 12 ? 'PM' : 'AM';
        return `${month}/${day}/${year} ${hour}:${minutes} ${amPM}`;
    }

    render() {
        let date = '';
        const todoItem = this.state.todoItem;
        let isMarked = todoItem.isMarked;
        let text = todoItem.text.replace(/\\n/g,'\n');
        if (todoItem.created) {
            const parsedDate = new Date(todoItem.created);
            date = this.getFormattedDateTime(parsedDate);
        }


        return <div className="todoItem">
            <div>
                <button onClick={this.onMarkClicked}>{isMarked ? 'Restore' : 'Remove'}</button>
            </div>
            <div className="text">
                <Editable content={text} elementTag="span" elementProps={{ className: 'inner' }} onChange={this.onTodoItemTextChanged} />
            </div>
            <div className="info">
                <span className="date">{date || 'No Date.'}</span>
                <span className="line" onClick={this.onLineClicked}> Line {todoItem.line + 1}</span>
            </div>
        </div>;
    }

    onMarkClicked = () => {
        if (this.props.onTodoMarkClicked) {
            this.props.onTodoMarkClicked(this.props.todoItem);
        }
    }

    onLineClicked = () => {
        if (!this.state.todoItem.isMarked) {
            vscode.postMessage({
                command: 'goto',
                data: this.state.todoItem,
            });
        }
    }

    onTodoItemTextChanged = (content: string) => {
        if (this.props.onTodoItemTextChanged) {
            const text = content;
            const todoItem = Object.assign({}, this.state.todoItem, { text });
            this.setState({ todoItem });
            clearTimeout(this.timerId);
            this.timerId = setTimeout(() => {
                this.props.onTodoItemTextChanged(todoItem, text);
            }, 500);
        }
    }
}