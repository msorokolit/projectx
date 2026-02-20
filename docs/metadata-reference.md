# Metadata Reference

## Root object

```json
{
  "name": "TradeManagement",
  "version": "1.0.0",
  "catalogs": [],
  "documents": [],
  "registers": [],
  "roles": []
}
```

## Catalog

```json
{
  "name": "Items",
  "title": "Items",
  "fields": [{ "name": "name", "type": "string", "required": true }],
  "hooks": { "beforeWrite": "script.name" }
}
```

## Document

```json
{
  "name": "SalesInvoice",
  "title": "Sales Invoice",
  "fields": [{ "name": "lines", "type": "array", "required": true }],
  "hooks": { "beforePost": "salesInvoice.beforePost" }
}
```

## Register

```json
{
  "name": "StockBalance",
  "title": "Stock Balance",
  "type": "accumulation",
  "dimensions": ["itemId", "warehouseId"],
  "resources": ["quantity", "amount"]
}
```

## Role permissions

```json
{
  "name": "Manager",
  "permissions": [
    {
      "objectType": "document",
      "object": "SalesInvoice",
      "actions": ["read", "write", "post"]
    }
  ]
}
```
