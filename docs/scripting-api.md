# JavaScript Scripting API

Business logic scripts are plain JavaScript function expressions.

## Script format

```js
({ document, addMovement, getBalance, setField, reject, context, db, registers, log }) => {
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
- `db`:
  - `db.getDocument(documentName, documentId)`
  - `db.listCatalogRecords(catalogName)`
- `registers`:
  - `registers.getBalance(registerName, filter)`
  - `registers.addMovement(movement)`
- `log(message, data?)`: writes script log into audit stream.

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
- Forbidden tokens are rejected (`require`, `process`, dynamic `eval`/`Function`, and Node internals).
- Dynamic code generation is disabled in sandbox context.

## Scripting admin APIs

- `GET /api/scripting/metrics` (Admin)
- `GET /api/scripting/registry` (Admin)
- `POST /api/scripting/registry` (Admin) — register/update script source
- `POST /api/scripting/validate` (Admin) — validate script source without running business operation
