(function () {
  const state = {
    token: null,
    role: null,
    lastReceiptId: null,
    lastInvoiceId: null
  };

  const consoleNode = document.getElementById("console");
  const authStateNode = document.getElementById("authState");

  function log(message, payload) {
    const line = `[${new Date().toISOString()}] ${message}`;
    const full = payload ? `${line}\n${JSON.stringify(payload, null, 2)}\n` : `${line}\n`;
    consoleNode.textContent = `${full}${consoleNode.textContent}`;
  }

  function read(id) {
    return document.getElementById(id).value;
  }

  function write(id, value) {
    document.getElementById(id).value = value;
  }

  function updateRoleVisibility() {
    const isViewer = state.role === "Viewer";
    [
      "createItemBtn",
      "createWarehouseBtn",
      "createReceiptBtn",
      "postReceiptBtn",
      "createInvoiceBtn",
      "postInvoiceBtn",
      "unpostInvoiceBtn"
    ].forEach((id) => {
      document.getElementById(id).disabled = isViewer;
    });
  }

  async function request(method, url, payload) {
    const response = await fetch(url, {
      method,
      headers: {
        "content-type": "application/json",
        ...(state.token ? { authorization: `Bearer ${state.token}` } : {})
      },
      body: payload ? JSON.stringify(payload) : undefined
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.message || `${method} ${url} failed`);
    }
    return body;
  }

  document.getElementById("loginBtn").addEventListener("click", async () => {
    try {
      const response = await request("POST", "/api/auth/login", {
        username: read("username"),
        password: read("password")
      });
      state.token = response.accessToken;
      state.role = response.user.role;
      updateRoleVisibility();
      authStateNode.textContent = `Authenticated as ${response.user.username} (${response.user.role})`;
      log("Logged in", response.user);
    } catch (error) {
      log("Login failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("createItemBtn").addEventListener("click", async () => {
    try {
      const item = await request("POST", "/api/catalog/Items", {
        name: read("itemName"),
        sku: read("itemSku"),
        taxRate: Number(read("itemTaxRate"))
      });
      write("receiptItemId", item.id);
      write("invoiceItemId", item.id);
      log("Item created", item);
    } catch (error) {
      log("Create item failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("createWarehouseBtn").addEventListener("click", async () => {
    try {
      const warehouse = await request("POST", "/api/catalog/Warehouses", {
        name: read("warehouseName")
      });
      write("receiptWarehouseId", warehouse.id);
      write("invoiceWarehouseId", warehouse.id);
      log("Warehouse created", warehouse);
    } catch (error) {
      log("Create warehouse failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("createReceiptBtn").addEventListener("click", async () => {
    try {
      const receipt = await request("POST", "/api/document/WarehouseReceipt", {
        warehouseId: read("receiptWarehouseId"),
        lines: [
          {
            itemId: read("receiptItemId"),
            quantity: Number(read("receiptQty")),
            price: Number(read("receiptPrice"))
          }
        ]
      });
      state.lastReceiptId = receipt.id;
      log("WarehouseReceipt created", receipt);
    } catch (error) {
      log("Create receipt failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("postReceiptBtn").addEventListener("click", async () => {
    try {
      if (!state.lastReceiptId) {
        throw new Error("Create receipt first");
      }
      const posted = await request(
        "POST",
        `/api/document/WarehouseReceipt/${state.lastReceiptId}/post`
      );
      log("WarehouseReceipt posted", posted);
    } catch (error) {
      log("Post receipt failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("createInvoiceBtn").addEventListener("click", async () => {
    try {
      const invoice = await request("POST", "/api/document/SalesInvoice", {
        warehouseId: read("invoiceWarehouseId"),
        lines: [
          {
            itemId: read("invoiceItemId"),
            quantity: Number(read("invoiceQty")),
            price: Number(read("invoicePrice")),
            taxRate: Number(read("invoiceTaxRate"))
          }
        ]
      });
      state.lastInvoiceId = invoice.id;
      log("SalesInvoice created", invoice);
    } catch (error) {
      log("Create invoice failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("postInvoiceBtn").addEventListener("click", async () => {
    try {
      if (!state.lastInvoiceId) {
        throw new Error("Create invoice first");
      }
      const posted = await request(
        "POST",
        `/api/document/SalesInvoice/${state.lastInvoiceId}/post`
      );
      log("SalesInvoice posted", posted);
    } catch (error) {
      log("Post invoice failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("unpostInvoiceBtn").addEventListener("click", async () => {
    try {
      if (!state.lastInvoiceId) {
        throw new Error("Create invoice first");
      }
      const unposted = await request(
        "POST",
        `/api/document/SalesInvoice/${state.lastInvoiceId}/unpost`
      );
      log("SalesInvoice unposted", unposted);
    } catch (error) {
      log("Unpost invoice failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("readBalanceBtn").addEventListener("click", async () => {
    try {
      const itemId = read("invoiceItemId");
      const warehouseId = read("invoiceWarehouseId");
      const balance = await request(
        "GET",
        `/api/register/StockBalance/balance?itemId=${encodeURIComponent(
          itemId
        )}&warehouseId=${encodeURIComponent(warehouseId)}`
      );
      log("Balance", balance);
    } catch (error) {
      log("Read balance failed", { message: String(error.message || error) });
    }
  });
})();
