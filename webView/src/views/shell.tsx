import * as React from 'react';
import { TodoItem } from '../interfaces/todoItem';
import { TodoGroup } from '../components/todoGroup';
import * as helpers from '../todoHelpers';


interface State {
    todoItems?: Map<string, TodoItem[]>;
    completedItems?: Map<string, TodoItem[]>;
    view?: string;
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
        const todoItems = this.state.todoItems;
        const completedItems = this.state.completedItems;
        const divClass = this.state.view === 'completed' ? 'shell completed' : 'shell';
        if (this.state.todoItems) {
            return <div>
                <button onClick={this.toggleView}>Toggle View</button>
                <div className={divClass}>
                    <div className='pending' >
                        {
                            todoItems ? [...todoItems].sort(([keyA, valueA], [keyB, valueB]) => { return keyA.localeCompare(keyB); }).map(([key, value]) => {
                                return <TodoGroup onTodoMarkClicked={(item) => { this.onTodoItemMarked(item); }} key={key} fileUri={key} todoItems={value} />;
                            }) : null
                        }
                    </div>
                    <div className='completed'>
                        {
                            completedItems ? [...completedItems].sort(([keyA, valueA], [keyB, valueB]) => { return keyA.localeCompare(keyB); }).map(([key, value]) => {
                                return <TodoGroup onTodoMarkClicked={(item) => { this.onTodoItemMarked(item); }} key={key} fileUri={key} todoItems={value} />;
                            }) : null
                        }
                    </div>
                </div></div>;
        } else {
            return <div></div>;
        }
    }

    toggleView = () => {
        this.setState({ view: this.state.view === 'completed' ? '' : 'completed' });
    }

    onTodoItemMarked = (todoItem: TodoItem) => {
        if (!todoItem.isMarked) {
            const newTodoItem = Object.assign({}, todoItem, { isMarked: true });
            const completedItems = this.state.completedItems ? new Map<string, TodoItem[]>(this.state.completedItems) : new Map<string, TodoItem[]>();
            const group = completedItems.get(todoItem.fileUri) || [];
            group.push(newTodoItem);
            completedItems.set(todoItem.fileUri, group);
            const oldGroup = this.state.todoItems.get(todoItem.fileUri);
            const index = oldGroup.indexOf(todoItem);
            oldGroup.splice(index, 1);
            if (oldGroup.length === 0) {
                this.state.todoItems.delete(todoItem.fileUri);
            }
            this.setState({ completedItems, todoItems: this.state.todoItems });
            helpers.completeTodo(todoItem);
        } else {            
            const oldGroup = this.state.completedItems.get(todoItem.fileUri);
            const index = oldGroup.indexOf(todoItem);
            oldGroup.splice(index, 1);
            if (oldGroup.length === 0) {
                this.state.completedItems.delete(todoItem.fileUri);
            }
            if(this.state.completedItems.size === 0){
                this.toggleView();
            }
            this.setState({ completedItems: this.state.completedItems });
            helpers.restoreTodo(todoItem);
        }
    }
}