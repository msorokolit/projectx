({ document, addMovement, setField, reject }) => {
  const lines = Array.isArray(document.lines) ? document.lines : [];
  if (lines.length === 0) {
    reject("WarehouseReceipt must contain at least one line.");
  }

  let totalAmount = 0;
  for (const line of lines) {
    const quantity = Number(line.quantity ?? 0);
    const price = Number(line.price ?? 0);
    if (quantity <= 0) {
      reject(`Invalid quantity for item ${line.itemId}.`);
    }
    if (price < 0) {
      reject(`Invalid price for item ${line.itemId}.`);
    }

    totalAmount += quantity * price;
    addMovement({
      register: "StockBalance",
      kind: "in",
      dimensions: {
        itemId: line.itemId,
        warehouseId: document.warehouseId
      },
      resources: {
        quantity,
        amount: quantity * price
      }
    });
  }

  setField("totalAmount", totalAmount);
}
