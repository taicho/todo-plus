import { TodoItem as TodoItemInterface } from '../../../src/interfaces/todoItem';

export interface TodoItem extends TodoItemInterface {
    isMarked? : boolean;
}