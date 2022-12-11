import { gql, useLazyQuery, useMutation } from "@apollo/client";
import { Button, Checkbox, FormLabel, Input } from "@mui/material";
import React, { useCallback, useState } from "react";
import { useEffectOnce } from "react-use";
import type { Todo } from "server/src/types/generated/graphql";
import { useTodoStore } from "./store";

const GQL_GET_TODO_LIST = gql`
  query GetTodoList {
    getTodoList {
      createdAt
      id
      status
      text
    }
  }
`;

const GQL_ADD_TODO = gql`
  mutation Mutation($text: String!) {
    addTodo(text: $text) {
      id
      text
      status
      createdAt
    }
  }
`;

const GQL_UPDATE_TODO = gql`
  mutation UpdateTodo($id: String!, $text: String, $status: TodoStatus) {
    updateTodo(id: $id, text: $text, status: $status) {
      id
      text
      status
      createdAt
    }
  }
`;

const useInputText = (): [
  string,
  React.Dispatch<React.SetStateAction<string>>,
  (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
] => {
  const [inputText, setInputText] = useState<string>("");
  const onChangeInputText = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInputText(e.target.value);
    },
    []
  );

  return [inputText, setInputText, onChangeInputText];
};

const TodoList = ({
  onClickTodoCheckbox,
  todoList,
  prefix,
}: {
  prefix: string;
  onClickTodoCheckbox: (e: React.MouseEvent<HTMLButtonElement>) => void;
  todoList: readonly Todo[];
}) => {
  return (
    <>
      {todoList.map((todo) => (
        <div key={`${prefix}-${todo.id}`}>
          <FormLabel>
            <Checkbox
              onClick={onClickTodoCheckbox}
              inputProps={
                {
                  "data-todo-id": todo.id,
                } as unknown as React.InputHTMLAttributes<HTMLInputElement>
              }
              checked={todo.status === "CLOSE"}
            />
            {todo.text}
          </FormLabel>
        </div>
      ))}
    </>
  );
};

function App() {
  const [getTodoList] = useLazyQuery<{
    getTodoList: ReadonlyArray<Todo>;
  }>(GQL_GET_TODO_LIST);
  const [addTodo] = useMutation<{ addTodo: Todo }, { text: string }>(
    GQL_ADD_TODO
  );
  const [updateTodo] = useMutation<
    { updateTodo: Todo },
    { id: string; text?: string; status?: Todo["status"] }
  >(GQL_UPDATE_TODO);
  const [inputText, setInputText, onChangeInputText] = useInputText();

  const store = useTodoStore();
  const { closeTodoList, openTodoList, todoList } = useTodoStore((state) => ({
    todoList: state.todoList,
    openTodoList: state.todoList.filter((x) => x.status !== "CLOSE"),
    closeTodoList: state.todoList.filter((x) => x.status === "CLOSE"),
  }));

  useEffectOnce(() => {
    (async () => {
      const newTodoList =
        (
          await getTodoList({ fetchPolicy: "network-only" })
        ).data?.getTodoList.map((todo) => todo) || [];
      store.setTodoList(newTodoList);
    })();
  });

  const onPost = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const text = inputText;
      setInputText("");
      const todo =
        (
          await addTodo({
            variables: {
              text,
            },
          })
        ).data?.addTodo || null;

      if (todo == null) {
        return;
      }

      store.addTodo(todo);
    },
    [addTodo, inputText, setInputText, store]
  );

  const onClickTodoCheckbox = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      (async () => {
        const { todoId } = (
          e.target as unknown as { dataset: { todoId: string } }
        ).dataset;

        const idx = todoList.findIndex((todo) => todo.id == todoId);
        if (idx === -1) {
          return;
        }

        const todo = todoList[idx];
        const status: Todo["status"] =
          todo.status === "OPEN" ? "CLOSE" : "OPEN";
        store.updateTodo({ ...todo, status });

        await updateTodo({
          variables: {
            id: todoId,
            status,
          },
        });
      })();
    },
    [store, todoList, updateTodo]
  );

  return (
    <div>
      <form onSubmit={onPost}>
        <Input
          value={inputText}
          onChange={onChangeInputText}
          inputProps={{ required: true }}
        />
        <Button type="submit">Add Todo</Button>

        <TodoList
          prefix="open"
          onClickTodoCheckbox={onClickTodoCheckbox}
          todoList={openTodoList}
        />
        <details>
          <summary>Completed</summary>
          <TodoList
            prefix="close"
            onClickTodoCheckbox={onClickTodoCheckbox}
            todoList={closeTodoList}
          />
        </details>
      </form>
    </div>
  );
}

export default App;
