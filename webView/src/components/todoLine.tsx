import { TodoItem } from '../interfaces/todoItem';
import * as React from 'react';
import { vscode } from '../utils';
import { Editable } from './editable';
export interface Props {
    todoItem: TodoItem;
    onTodoItemTextChanged: (item: TodoItem, text: string) => void;
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

    render() {
        let date = '';
        const todoItem = this.state.todoItem;
        let text = todoItem.text;
        if (todoItem.created) {
            const parsedDate = new Date(todoItem.created);
            date = `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}/${parsedDate.getFullYear()} ${parsedDate.getHours() > 12 ? `${parsedDate.getHours() - 12}:${parsedDate.getMinutes()} PM` : `${parsedDate.getHours()}:${parsedDate.getMinutes()} AM`}`;
        }


        return <div className="todoItem">
            <div>
                <button>Mark</button>
            </div>
            <div className="text">
                <Editable content={text} elementTag="span" elementProps={{ className: 'inner' }} onChange={this.onTodoItemTextChanged} />
            </div>
            <div className="info">
                <span className="date">{date || 'No Date.'}</span>
                <span className="line" onClick={this.onLineClicked}>Line {todoItem.line + 1}</span>
            </div>
        </div>;
    }

    onLineClicked = () => {
        vscode.postMessage({
            command: 'goto',
            data: this.state.todoItem,
        });
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