(function () {
  const STORAGE_KEY = "oneCCloneWebState.v2";
  const state = {
    token: null,
    role: null,
    metadata: null,
    username: null,
    lastReceiptId: null,
    lastInvoiceId: null,
    lastItemId: null,
    lastWarehouseId: null
  };

  const consoleNode = document.getElementById("console");
  const authStateNode = document.getElementById("authState");

  function persistState() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: state.token,
        role: state.role,
        username: state.username,
        lastReceiptId: state.lastReceiptId,
        lastInvoiceId: state.lastInvoiceId,
        lastItemId: state.lastItemId,
        lastWarehouseId: state.lastWarehouseId
      })
    );
  }

  function restoreState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      state.token = parsed.token ?? null;
      state.role = parsed.role ?? null;
      state.username = parsed.username ?? null;
      state.lastReceiptId = parsed.lastReceiptId ?? null;
      state.lastInvoiceId = parsed.lastInvoiceId ?? null;
      state.lastItemId = parsed.lastItemId ?? null;
      state.lastWarehouseId = parsed.lastWarehouseId ?? null;
    } catch (_error) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

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

  function setPairList(listId, pairs) {
    const node = document.getElementById(listId);
    node.innerHTML = "";
    pairs.forEach(([label, value]) => {
      const li = document.createElement("li");
      li.textContent = `${label}: ${value ?? "-"}`;
      node.appendChild(li);
    });
  }

  function setWorkflowSteps(steps) {
    setList(
      "workflowProgress",
      steps.map((step) => `${step.done ? "✅" : "⬜"} ${step.label}`)
    );
  }

  function refreshWorkflowContext() {
    setPairList("workflowContext", [
      ["User", state.username ? `${state.username} (${state.role ?? "unknown"})` : "none"],
      ["Item", state.lastItemId],
      ["Warehouse", state.lastWarehouseId],
      ["Last receipt", state.lastReceiptId],
      ["Last invoice", state.lastInvoiceId]
    ]);
  }

  function updateAuthState() {
    if (!state.token || !state.role) {
      authStateNode.textContent = "Not authenticated";
      return;
    }
    authStateNode.textContent = `Authenticated as ${state.username ?? "user"} (${state.role})`;
  }

  function applyCredentials(username) {
    write("username", username);
    write("password", username);
  }

  function buildRegisterFilter(patch) {
    const current = parseJsonInput("registerFilterJson");
    write(
      "registerFilterJson",
      JSON.stringify(
        {
          ...current,
          ...patch
        },
        null,
        2
      )
    );
  }

  async function loadMetadata() {
    const metadata = await request("GET", "/api/metadata");
    state.metadata = metadata;
    renderMetadata();
    syncObjectPickers();
    log("Metadata loaded", {
      catalogs: metadata.catalogs.length,
      documents: metadata.documents.length,
      registers: metadata.registers.length
    });
    return metadata;
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
      "unpostDocumentBtn",
      "runGuidedFlowBtn",
      "seedDemoBtn"
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

  async function ensureMetadataLoaded() {
    if (state.metadata) {
      return;
    }
    await loadMetadata();
  }

  async function runGuidedTradeFlow() {
    if (!state.token) {
      throw new Error("Please login first.");
    }
    if (state.role === "Viewer") {
      throw new Error("Viewer role cannot run write workflow.");
    }

    const startedAt = Date.now();
    const now = new Date().toISOString().replaceAll(":", "-");
    const itemName = `Guided item ${now}`;
    const sku = `GUIDE-${Math.floor(Math.random() * 10000)}`;
    const warehouseName = `Guided warehouse ${now}`;

    const steps = [
      { key: "metadata", label: "Metadata loaded", done: false },
      { key: "item", label: "Item created", done: false },
      { key: "warehouse", label: "Warehouse created", done: false },
      { key: "receiptCreated", label: "Warehouse receipt created", done: false },
      { key: "receiptPosted", label: "Warehouse receipt posted", done: false },
      { key: "invoiceCreated", label: "Sales invoice created", done: false },
      { key: "invoicePosted", label: "Sales invoice posted", done: false },
      { key: "balanceRead", label: "Balance read", done: false }
    ];
    setWorkflowSteps(steps);

    await ensureMetadataLoaded();
    steps.find((item) => item.key === "metadata").done = true;
    setWorkflowSteps(steps);

    const item = await request("POST", "/api/catalog/Items", {
      name: itemName,
      sku,
      taxRate: 0.2
    });
    state.lastItemId = item.id;
    write("receiptItemId", item.id);
    write("invoiceItemId", item.id);
    buildRegisterFilter({ itemId: item.id });
    steps.find((itemStep) => itemStep.key === "item").done = true;
    setWorkflowSteps(steps);

    const warehouse = await request("POST", "/api/catalog/Warehouses", {
      name: warehouseName
    });
    state.lastWarehouseId = warehouse.id;
    write("receiptWarehouseId", warehouse.id);
    write("invoiceWarehouseId", warehouse.id);
    buildRegisterFilter({ warehouseId: warehouse.id });
    steps.find((itemStep) => itemStep.key === "warehouse").done = true;
    setWorkflowSteps(steps);

    const receipt = await request("POST", "/api/document/WarehouseReceipt", {
      warehouseId: warehouse.id,
      lines: [{ itemId: item.id, quantity: 10, price: 100 }]
    });
    state.lastReceiptId = receipt.id;
    steps.find((itemStep) => itemStep.key === "receiptCreated").done = true;
    setWorkflowSteps(steps);

    await request("POST", `/api/document/WarehouseReceipt/${receipt.id}/post`);
    steps.find((itemStep) => itemStep.key === "receiptPosted").done = true;
    setWorkflowSteps(steps);

    const invoice = await request("POST", "/api/document/SalesInvoice", {
      warehouseId: warehouse.id,
      lines: [{ itemId: item.id, quantity: 2, price: 150, taxRate: 0.2 }]
    });
    state.lastInvoiceId = invoice.id;
    steps.find((itemStep) => itemStep.key === "invoiceCreated").done = true;
    setWorkflowSteps(steps);

    await request("POST", `/api/document/SalesInvoice/${invoice.id}/post`);
    steps.find((itemStep) => itemStep.key === "invoicePosted").done = true;
    setWorkflowSteps(steps);

    const balance = await request(
      "GET",
      `/api/register/Inventory/balance?${toQueryString({
        itemId: item.id,
        warehouseId: warehouse.id
      })}`
    );
    steps.find((itemStep) => itemStep.key === "balanceRead").done = true;
    setWorkflowSteps(steps);

    persistState();
    refreshWorkflowContext();
    log("Guided trade flow completed", {
      durationMs: Date.now() - startedAt,
      itemId: item.id,
      warehouseId: warehouse.id,
      receiptId: receipt.id,
      invoiceId: invoice.id,
      balance
    });
  }

  document.getElementById("loginBtn").addEventListener("click", async () => {
    try {
      const response = await request("POST", "/api/auth/login", {
        username: read("username"),
        password: read("password")
      });
      state.token = response.accessToken;
      state.role = response.user.role;
      state.username = response.user.username;
      updateRoleVisibility();
      updateAuthState();
      persistState();
      refreshWorkflowContext();
      log("Logged in", response.user);
      await loadMetadata();
    } catch (error) {
      log("Login failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("refreshMetadataBtn").addEventListener("click", async () => {
    try {
      await loadMetadata();
      log("Metadata refreshed");
    } catch (error) {
      log("Metadata refresh failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("loadMetadataBtn").addEventListener("click", async () => {
    try {
      await loadMetadata();
      setWorkflowSteps([
        { label: "Metadata loaded", done: true },
        { label: "Ready for guided flow", done: false }
      ]);
    } catch (error) {
      log("Workflow metadata load failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("runGuidedFlowBtn").addEventListener("click", async () => {
    try {
      await runGuidedTradeFlow();
    } catch (error) {
      log("Guided flow failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("readStockSnapshotBtn").addEventListener("click", async () => {
    try {
      if (!state.lastItemId || !state.lastWarehouseId) {
        throw new Error("Run guided flow or create item/warehouse first.");
      }
      const balance = await request(
        "GET",
        `/api/register/Inventory/balance?${toQueryString({
          itemId: state.lastItemId,
          warehouseId: state.lastWarehouseId
        })}`
      );
      log("Stock snapshot", balance);
    } catch (error) {
      log("Read stock snapshot failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("seedDemoBtn").addEventListener("click", async () => {
    try {
      const seeded = await request("POST", "/api/demo/seed/trade-management");
      log("Demo seeded", seeded);
    } catch (error) {
      log("Demo seed failed", { message: String(error.message || error) });
    }
  });

  document.getElementById("loginAsAdminBtn").addEventListener("click", () => {
    applyCredentials("admin");
  });
  document.getElementById("loginAsManagerBtn").addEventListener("click", () => {
    applyCredentials("manager");
  });
  document.getElementById("loginAsViewerBtn").addEventListener("click", () => {
    applyCredentials("viewer");
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
      state.lastItemId = item.id;
      write("receiptItemId", item.id);
      write("invoiceItemId", item.id);
      buildRegisterFilter({ itemId: item.id });
      persistState();
      refreshWorkflowContext();
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
      state.lastWarehouseId = warehouse.id;
      write("receiptWarehouseId", warehouse.id);
      write("invoiceWarehouseId", warehouse.id);
      buildRegisterFilter({ warehouseId: warehouse.id });
      persistState();
      refreshWorkflowContext();
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
      persistState();
      refreshWorkflowContext();
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
      persistState();
      refreshWorkflowContext();
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

  document.getElementById("clearConsoleBtn").addEventListener("click", () => {
    consoleNode.textContent = "";
  });

  restoreState();
  if (state.username) {
    write("username", state.username);
  }
  if (state.username && !read("password")) {
    write("password", state.username);
  }
  updateAuthState();
  updateRoleVisibility();

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

  if (state.lastItemId) {
    write("receiptItemId", state.lastItemId);
    write("invoiceItemId", state.lastItemId);
  }
  if (state.lastWarehouseId) {
    write("receiptWarehouseId", state.lastWarehouseId);
    write("invoiceWarehouseId", state.lastWarehouseId);
  }
  refreshWorkflowContext();
})();
