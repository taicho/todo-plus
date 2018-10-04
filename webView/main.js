(function () {
    const createElement = (domstring) => {
        const html = new DOMParser().parseFromString(domstring, 'text/html');
        return html.body.firstChild;
    };

    function createTodoTableItem(item) {
        const element = document.querySelector('#templates > .todoItem');
        let html = element.outerHTML;
        let created = 'No date.';
        if (item.created) {
            const parsedDate = new Date(item.created);
            created = `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}/${parsedDate.getFullYear()} ${parsedDate.getHours() > 12 ? `${parsedDate.getHours() - 12}:${parsedDate.getMinutes()} PM` : `${parsedDate.getHours()}:${parsedDate.getMinutes()} AM`}`;
        }
        html = html.replace('{date}', created);
        html = html.replace('{text}', item.text);
        html = html.replace('{line}', item.line + 1);
        const newElement = createElement(html);
        newElement.todoItem = item;
        let timerId = 0;
        newElement.querySelector('.line').addEventListener('click', () => {
            gotoItem(item);
        });
        const button = newElement.querySelector('button');
        button.addEventListener('click', (e) => {
            completeTodo(newElement.todoItem);
        });
        newElement.addEventListener('input', (e) => {
            clearTimeout(timerId);
            timerId = setTimeout(() => {
                const text = newElement.querySelector('.text span').innerHTML;
                newElement.todoItem.text = text.trim();
                updateTodo(newElement.todoItem);
            }, 1000);
        });
        return newElement;
    }

    const vscode = acquireVsCodeApi();
    const contentBody = document.querySelector('#content');

    function completeTodo(todoItem) {
        vscode.postMessage({
            command: 'delete',
            data: todoItem,
        });
    }

    function updateTodo(todoItem) {
        vscode.postMessage({
            command: 'update',
            data: todoItem,
        });
    }

    function gotoItem(todoItem) {
        vscode.postMessage({
            command: 'goto',
            data: todoItem,
        });
    }

    function loadData(data) {
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

    function createContainer(fileUri) {
        let elementText = document.querySelector('#templates .todoList').outerHTML;
        elementText = elementText.replace('{file}', fileUri);
        const element = createElement(elementText);
        element.querySelector('.header').addEventListener('click', () => {
            gotoItem({ fileUri });
        });
        return element;
    }

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'load':
                const data = message.data;
                loadData(data);
                break;
        }
    });
}());