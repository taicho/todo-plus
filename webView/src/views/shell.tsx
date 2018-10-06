import * as React from 'react';
import { TodoItem } from '../interfaces/todoItem';
import { TodoGroup } from '../components/todoGroup';


interface State {
    todoItems?: Map<string, TodoItem[]>;
}

export class Shell extends React.Component<any, State>  {

    constructor(p, c) {
        super(p, c);
        this.state = {};
    }

    componentDidMount() {
        console.log('mounted');
        window.addEventListener('message', this.processMessage);
    }

    componentWillUnmount() {
        console.log('unmounted');
        window.removeEventListener('message', this.processMessage);
    }

    processMessage = (event) => {
        const message = event.data;
        switch (message.command) {
            case 'load':
                const data = message.data;
                this.loadItems(data);
                break;
        }
    }

    loadItems(todoItems: TodoItem[]) {
        const groups = this.state.todoItems ? new Map<string, TodoItem[]>(this.state.todoItems) : new Map<string, TodoItem[]>();
        for (const todoItem of todoItems) {
            if (groups.has(todoItem.fileUri)) {
                groups.delete(todoItem.fileUri);
            }
        }
        for (const todoItem of todoItems) {
            const group = groups.get(todoItem.fileUri) || [];
            group.push(todoItem);
            groups.set(todoItem.fileUri, group);
        }
        console.log('items loaded');
        this.setState({ todoItems: groups });
    }

    render() {
        if (this.state.todoItems) {
            return <React.Fragment>
                {
                    [...this.state.todoItems].sort(([keyA, valueA], [keyB, valueB]) => { return keyA.localeCompare(keyB); }).map(([key, value]) => {
                        return <TodoGroup key={key} fileUri={key} todoItems={value} />;
                    })
                }
            </React.Fragment>;
        } else {
            return <React.Fragment></React.Fragment>;
        }
    }
}