import {vscode} from './utils';

const contentBody = document.querySelector('#content');

const createElement = (domstring) => {
    const html = new DOMParser().parseFromString(domstring, 'text/html');
    return html.body.firstChild as HTMLElement;
};

export function createTodoTableItem(todoItem) {
    const element = document.querySelector('#templates > .todoItem');
    let html = element.outerHTML;
    let created = 'No date.';
    if (todoItem.created) {
        const parsedDate = new Date(todoItem.created);
        created = `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}/${parsedDate.getFullYear()} ${parsedDate.getHours() > 12 ? `${parsedDate.getHours() - 12}:${parsedDate.getMinutes()} PM` : `${parsedDate.getHours()}:${parsedDate.getMinutes()} AM`}`;
    }
    html = html.replace('{date}', created);
    html = html.replace('{text}', todoItem.text);
    html = html.replace('{line}', todoItem.line + 1);
    const newElement = createElement(html);
    // newElement.todoItem = item;
    let timerId : any = 0;
    newElement.querySelector('.line').addEventListener('click', () => {
        gotoItem(todoItem);
    });
    const button = newElement.querySelector('button');
    button.addEventListener('click', (e) => {
        completeTodo(todoItem);
    });
    newElement.addEventListener('input', (e) => {
        clearTimeout(timerId);        
        timerId = setTimeout(() => {
            const text = newElement.querySelector('.text span').innerHTML;
            todoItem.text = text.trim();
            updateTodo(todoItem);
        }, 1000);
    });
    return newElement;
}

export function completeTodo(todoItem) {
    vscode.postMessage({
        command: 'delete',
        data: todoItem,
    });
}

export function restoreTodo(todoItem) {
    vscode.postMessage({
        command: 'restore',
        data: todoItem,
    });
}

export function updateTodo(todoItem) {
    vscode.postMessage({
        command: 'update',
        data: todoItem,
    });
}

export function gotoItem(todoItem) {
    vscode.postMessage({
        command: 'goto',
        data: todoItem,
    });
}

export function loadData(data) {
    if (data) {
        // contentBody.innerHTML = '';
        const groups = {};
        for (const todoItem of data) {
            const group = groups[todoItem.fileUri] = groups[todoItem.fileUri] || [];
            group.push(todoItem);
        }
        for (const groupKey of Object.keys(groups)) {
            const group = groups[groupKey];
            const container = createContainer(groupKey);
            for (const item of group) {
                const todoItemElement = createTodoTableItem(item);
                container.appendChild(todoItemElement);
            }
            contentBody.appendChild(container);
        }
    }
}

export function createContainer(fileUri) {
    let elementText = document.querySelector('#templates .todoList').outerHTML;
    elementText = elementText.replace('{file}', fileUri);
    const element = createElement(elementText);
    element.querySelector('.header').addEventListener('click', () => {
        gotoItem({ fileUri });
    });
    return element;
}