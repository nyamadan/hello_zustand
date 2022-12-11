import { Todo } from "server/src/types/generated/graphql";
import create from "zustand";

interface TodoStore {
  todoList: readonly Todo[];
  setTodoList(todoList: readonly Todo[]): void;
  addTodo(todo: Todo): void;
  updateTodo(params: {
    id: string;
    text?: string;
    status?: Todo["status"];
  }): void;
}

export const useTodoStore = create<TodoStore>((set) => ({
  todoList: [],
  setTodoList(todoList) {
    set((state) => {
      return { ...state, todoList };
    });
  },
  addTodo(todo) {
    set((state) => {
      const { todoList } = state;
      return { ...state, todoList: [todo, ...todoList] };
    });
  },
  updateTodo({ id, status, text }) {
    set((state) => {
      const { todoList } = state;

      const idx = todoList.findIndex((todo) => todo.id === id);
      if (idx === -1) {
        throw new Error("Cannot find todo");
      }
      const todo = todoList[idx];

      const first = todoList.slice(0, idx);
      const last = todoList.slice(idx + 1);

      const newTodoList: readonly Todo[] = [
        ...first,
        { ...todo, status: status ?? todo.status, text: text ?? todo.text },
        ...last,
      ];

      return { ...state, todoList: newTodoList };
    });
  },
}));
