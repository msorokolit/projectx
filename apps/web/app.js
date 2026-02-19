(function () {
  const state = {
    token: null,
    role: null,
    metadata: null,
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

  function parseJsonInput(id) {
    const raw = read(id).trim();
    return raw ? JSON.parse(raw) : {};
  }

  function toQueryString(filter) {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      params.set(key, String(value));
    });
    return params.toString();
  }

  function setOptions(selectId, values) {
    const node = document.getElementById(selectId);
    node.innerHTML = "";
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      node.appendChild(option);
    });
  }

  function setList(listId, values) {
    const node = document.getElementById(listId);
    node.innerHTML = "";
    values.forEach((value) => {
      const li = document.createElement("li");
      li.textContent = value;
      node.appendChild(li);
    });
  }

  function renderMetadata() {
    if (!state.metadata) {
      return;
    }
    const catalogs = state.metadata.catalogs.map((item) => item.name);
    const documents = state.metadata.documents.map((item) => item.name);
    const registers = state.metadata.registers.map((item) => item.name);

    setList("metadataCatalogs", catalogs);
    setList("metadataDocuments", documents);
    setList("metadataRegisters", registers);

    setOptions("browseObject", catalogs);
    setOptions("editObject", catalogs);
    setOptions("lifecycleDocument", documents);
    setOptions("registerObject", registers);
  }

  function syncObjectPickers() {
    if (!state.metadata) {
      return;
    }
    const browseKind = read("browseKind");
    const editKind = read("editKind");

    if (browseKind === "catalog") {
      setOptions("browseObject", state.metadata.catalogs.map((item) => item.name));
    } else if (browseKind === "document") {
      setOptions("browseObject", state.metadata.documents.map((item) => item.name));
    } else {
      setOptions("browseObject", state.metadata.registers.map((item) => item.name));
    }

    if (editKind === "catalog") {
      setOptions("editObject", state.metadata.catalogs.map((item) => item.name));
    } else {
      setOptions("editObject", state.metadata.documents.map((item) => item.name));
    }
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
      "unpostInvoiceBtn",
      "createRecordBtn",
      "postDocumentBtn",
      "unpostDocumentBtn"
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
      const metadata = await request("GET", "/api/metadata");
      state.metadata = metadata;
      renderMetadata();
      syncObjectPickers();
      log("Metadata loaded", {
        catalogs: metadata.catalogs.length,
        documents: metadata.documents.length,
        registers: metadata.registers.length
      });
    } catch (error) {
      log("Login failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("refreshMetadataBtn").addEventListener("click", async () => {
    try {
      const metadata = await request("GET", "/api/metadata");
      state.metadata = metadata;
      renderMetadata();
      syncObjectPickers();
      log("Metadata refreshed");
    } catch (error) {
      log("Metadata refresh failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("browseKind").addEventListener("change", syncObjectPickers);
  document.getElementById("editKind").addEventListener("change", syncObjectPickers);

  document.getElementById("listObjectsBtn").addEventListener("click", async () => {
    try {
      const kind = read("browseKind");
      const object = read("browseObject");
      if (!object) {
        throw new Error("No object selected.");
      }
      let response;
      if (kind === "catalog") {
        response = await request("GET", `/api/catalog/${encodeURIComponent(object)}`);
      } else if (kind === "document") {
        response = await request("GET", `/api/document/${encodeURIComponent(object)}`);
      } else {
        response = await request(
          "GET",
          `/api/register/${encodeURIComponent(object)}/movements`
        );
      }
      log(`${kind} listing for ${object}`, response);
    } catch (error) {
      log("Object listing failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("createRecordBtn").addEventListener("click", async () => {
    try {
      const kind = read("editKind");
      const object = read("editObject");
      const payload = parseJsonInput("payloadJson");
      if (!object) {
        throw new Error("No object selected.");
      }
      const endpoint =
        kind === "catalog"
          ? `/api/catalog/${encodeURIComponent(object)}`
          : `/api/document/${encodeURIComponent(object)}`;
      const created = await request("POST", endpoint, payload);
      if (kind === "document") {
        write("lifecycleDocumentId", created.id);
      }
      log(`${kind} record created`, created);
    } catch (error) {
      log("Create record failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("postDocumentBtn").addEventListener("click", async () => {
    try {
      const documentType = read("lifecycleDocument");
      const id = read("lifecycleDocumentId");
      if (!documentType || !id) {
        throw new Error("Document type and id are required.");
      }
      const posted = await request(
        "POST",
        `/api/document/${encodeURIComponent(documentType)}/${encodeURIComponent(id)}/post`
      );
      log("Document posted", posted);
    } catch (error) {
      log("Post document failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("unpostDocumentBtn").addEventListener("click", async () => {
    try {
      const documentType = read("lifecycleDocument");
      const id = read("lifecycleDocumentId");
      if (!documentType || !id) {
        throw new Error("Document type and id are required.");
      }
      const unposted = await request(
        "POST",
        `/api/document/${encodeURIComponent(documentType)}/${encodeURIComponent(id)}/unpost`
      );
      log("Document unposted", unposted);
    } catch (error) {
      log("Unpost document failed", { message: String(error.message || error) });
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
      const filter = parseJsonInput("registerFilterJson");
      filter.itemId = item.id;
      write("registerFilterJson", JSON.stringify(filter, null, 2));
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
      const filter = parseJsonInput("registerFilterJson");
      filter.warehouseId = warehouse.id;
      write("registerFilterJson", JSON.stringify(filter, null, 2));
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
      const register = read("registerObject");
      const filter = parseJsonInput("registerFilterJson");
      const query = toQueryString(filter);
      const balance = await request(
        "GET",
        `/api/register/${encodeURIComponent(register)}/balance?${query}`
      );
      log("Balance", balance);
    } catch (error) {
      log("Read balance failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("readMovementsBtn").addEventListener("click", async () => {
    try {
      const register = read("registerObject");
      const movements = await request(
        "GET",
        `/api/register/${encodeURIComponent(register)}/movements`
      );
      log("Movements", movements);
    } catch (error) {
      log("Read movements failed", { message: String(error.message || error) });
    }
  });

  write(
    "payloadJson",
    JSON.stringify(
      {
        name: "Sample item",
        sku: "SAMPLE-01",
        taxRate: 0.2
      },
      null,
      2
    )
  );
  write(
    "registerFilterJson",
    JSON.stringify(
      {
        itemId: "",
        warehouseId: ""
      },
      null,
      2
    )
  );
})();
