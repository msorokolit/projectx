({ document, addMovement, getBalance, setField, reject }) => {
  const lines = Array.isArray(document.lines) ? document.lines : [];
  if (lines.length === 0) {
    reject("SalesInvoice must contain at least one line.");
  }

  let totalAmount = 0;
  let taxAmount = 0;

  for (const line of lines) {
    const quantity = Number(line.quantity ?? 0);
    const price = Number(line.price ?? 0);
    const taxRate = Number(line.taxRate ?? 0);
    if (quantity <= 0) {
      reject(`Invalid quantity for item ${line.itemId}.`);
    }

    const balance = getBalance("StockBalance", {
      itemId: line.itemId,
      warehouseId: document.warehouseId
    });
    const available = Number(balance.quantity ?? 0);
    if (available < quantity) {
      reject(
        `Not enough stock for item ${line.itemId}. Requested=${quantity}, Available=${available}.`
      );
    }

    const lineAmount = quantity * price;
    const lineTax = lineAmount * taxRate;
    totalAmount += lineAmount;
    taxAmount += lineTax;

    addMovement({
      register: "StockBalance",
      kind: "out",
      dimensions: {
        itemId: line.itemId,
        warehouseId: document.warehouseId
      },
      resources: {
        quantity,
        amount: lineAmount
      }
    });
  }

  setField("totalAmount", totalAmount);
  setField("taxAmount", taxAmount);
}
