# JavaScript Scripting API

Business logic scripts are plain JavaScript function expressions.

## Script format

```js
({ document, addMovement, getBalance, setField, reject, context }) => {
  // custom logic
}
```

## Available arguments

- `document`: mutable document payload object.
- `setField(name, value)`: updates document field.
- `addMovement(movement)`: appends register movement.
- `getBalance(registerName, filter)`: reads current register balance.
- `reject(message)`: aborts operation with error.
- `context`: `{ actor, objectName }`.

## Movement format

```js
addMovement({
  register: "StockBalance",
  kind: "in", // or "out"
  dimensions: { itemId: "..." },
  resources: { quantity: 10, amount: 200 }
});
```

## Hook names supported

- `beforeWrite`
- `onWrite`
- `beforePost`
- `onPost`
- `onUnpost`

## Safety model

- Scripts run through Node VM with timeout.
- Script globals are restricted (`Math`, `Date`, `JSON`).
- `process` is not exposed directly.
