document.addEventListener("DOMContentLoaded", () => {
  const dateTime = document.getElementById("dateTime");
  const customerName = document.getElementById("customerName");
  const itemsContainer = document.getElementById("itemsContainer");
  const addItemBtn = document.getElementById("addItemBtn");
  const grandTotal = document.getElementById("grandTotal");
  const saveBillBtn = document.getElementById("saveBillBtn");
  const printBillBtn = document.getElementById("printBillBtn");
  const savedBillsDiv = document.getElementById("savedBills");
  const printSection = document.getElementById("printSection");

  // Date & Time
  function updateDateTime() {
    dateTime.textContent = new Date().toLocaleString();
  }
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // Add product row
  function addItemRow() {
    const row = document.createElement("div");
    row.className = "itemRow";
    row.innerHTML = `
      <input type="text" class="itemName" placeholder="Product Name">
      <input type="text" class="itemQty" placeholder="Quantity 1kg">
      <input type="number" class="itemRate" placeholder="Rate (₹)" value="">
      <span class="itemTotal">0.00</span>
      <button class="removeBtn">Clear</button>
    `;
    itemsContainer.appendChild(row);

    const rateInput = row.querySelector(".itemRate");
    const totalSpan = row.querySelector(".itemTotal");
    const removeBtn = row.querySelector(".removeBtn");

    function recalc() {
      const rate = parseFloat(rateInput.value) || 0;
      totalSpan.textContent = rate.toFixed(2);
      recalcGrand();
    }

    rateInput.addEventListener("input", recalc);
    removeBtn.addEventListener("click", () => {
      row.remove();
      recalcGrand();
    });
  }

  function recalcGrand() {
    let sum = 0;
    itemsContainer.querySelectorAll(".itemRow").forEach(row => {
      const rate = parseFloat(row.querySelector(".itemRate").value) || 0;
      sum += rate;
    });
    grandTotal.textContent = sum.toFixed(2);
  }

async function saveBill() {
  const items = [];
  itemsContainer.querySelectorAll(".itemRow").forEach(row => {
    const name = row.querySelector(".itemName").value;
    const qty = row.querySelector(".itemQty").value;
    const rate = parseFloat(row.querySelector(".itemRate").value) || 0;
    if (name) {
      items.push({ name, qty, rate });
    }
  });

  const total = parseFloat(grandTotal.textContent) || 0;
  const paid = parseFloat(document.getElementById("paidAmount").value) || 0;
  const pending = total - paid;

  const bill = {
    customer: customerName.value,
    items: items,
    grandTotal: total,
    paidAmount: paid,
    pendingAmount: pending
  };

  const res = await fetch("/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bill)
  });

  const data = await res.json();
  if (data.status === "success") {
    loadBills();
    alert("Bill Saved!");
  }
}

async function loadBills() {
  const res = await fetch("/bills");
  const bills = await res.json();
  savedBillsDiv.innerHTML = "";

  let totalRevenue = 0;
  let totalPending = 0;

  bills.forEach(bill => {
    const div = document.createElement("div");
    div.className = "savedBill";
    div.innerHTML = `
      #${bill.id} | ${bill.customer} | ${bill.date} 
      | Total: ₹${bill.grandTotal} | Paid: ₹${bill.paidAmount} | Pending: ₹${bill.pendingAmount}
      <button class="deleteBtn" data-id="${bill.id}">🗑️ Delete</button>
      ${bill.pendingAmount > 0 ? `<button class="markPaidBtn" data-id="${bill.id}">✅ Mark as Paid</button>` : ""}
      <button class="printSavedBtn" data-id="${bill.id}">🖨️ Print</button>
    `;
    savedBillsDiv.appendChild(div);

    totalRevenue += parseFloat(bill.paidAmount) || 0;
    totalPending += parseFloat(bill.pendingAmount) || 0;
  });

  // Revenue summary
  if (bills.length > 0) {
    const revenueDiv = document.createElement("div");
    revenueDiv.className = "revenueBox";
    revenueDiv.innerHTML = `
      <h3>Total Revenue: ₹${totalRevenue.toFixed(2)}</h3>
      <h3>Pending Amount: ₹${totalPending.toFixed(2)}</h3>
    `;
    savedBillsDiv.appendChild(revenueDiv);
  }

  // Delete buttons
  document.querySelectorAll(".deleteBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (confirm("Delete this bill?")) {
        await fetch(`/delete/${id}`, { method: "DELETE" });
        loadBills();
      }
    });
  });

  // Mark Paid buttons
  document.querySelectorAll(".markPaidBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (confirm("Mark this bill as fully paid?")) {
        await fetch(`/markPaid/${id}`, { method: "PUT" });
        loadBills();
      }
    });
  });

  // Print buttons for saved bills
  document.querySelectorAll(".printSavedBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");

      const res = await fetch(`/bill/${id}`);
      const bill = await res.json();

      let html = `
        <div style="font-family:Arial; width:300px; padding:10px;">
          <h2 style="text-align:center;">🛒 Shop Bill</h2>
          <p><b>Customer:</b> ${bill.customer}</p>
          <p><b>Date:</b> ${bill.date}</p>
          <table border="1" width="100%" cellspacing="0" cellpadding="5" style="border-collapse:collapse; text-align:left;">
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Rate</th>
            </tr>
      `;

      bill.items.forEach(it => {
        html += `
          <tr>
            <td>${it.name}</td>
            <td>${it.qty}</td>
            <td>₹${it.rate.toFixed(2)}</td>
          </tr>
        `;
      });

      html += `
          </table>
          <h3 style="text-align:right;">Total: ₹${bill.grandTotal}</h3>
          <h3 style="text-align:right;">Paid: ₹${bill.paidAmount}</h3>
          <h3 style="text-align:right;">Pending: ₹${bill.pendingAmount}</h3>
        </div>
      `;

      const win = window.open("", "PrintBill", "width=400,height=600");
      win.document.write("<html><head><title>Bill</title></head><body>");
      win.document.write(html);
      win.document.write("</body></html>");
      win.document.close();
      win.print();
    });
  });
}

  function printBill() {
    const customer = customerName.value;
    const date = new Date().toLocaleString();
    const items = [];
    itemsContainer.querySelectorAll(".itemRow").forEach(row => {
      const name = row.querySelector(".itemName").value;
      const qty = row.querySelector(".itemQty").value;
      const rate = parseFloat(row.querySelector(".itemRate").value) || 0;
      if (name) {
        items.push({ name, qty, rate });
      }
    });

    // Build printable content
    let html = `
      <div style="font-family:Arial; width:300px; padding:10px;">
        <h2 style="text-align:center;">🛒 Shop Bill</h2>
        <p><b>Customer:</b> ${customer}</p>
        <p><b>Date:</b> ${date}</p>
        <table border="1" width="100%" cellspacing="0" cellpadding="5" style="border-collapse:collapse; text-align:left;">
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Rate</th>
          </tr>`;
    items.forEach(it => {
      html += `
        <tr>
          <td>${it.name}</td>
          <td>${it.qty}</td>
          <td>₹${it.rate.toFixed(2)}</td>
        </tr>`;
    });
    html += `
        </table>
        <h3 style="text-align:right;">Total: ₹${grandTotal.textContent}</h3>
      </div>
    `;

    printSection.innerHTML = html;

    const win = window.open("", "PrintBill", "width=400,height=600");
    win.document.write("<html><head><title>Bill</title></head><body>");
    win.document.write(printSection.innerHTML);
    win.document.write("</body></html>");
    win.document.close();
    win.print();
  }

  // Events
  addItemBtn.addEventListener("click", addItemRow);
  saveBillBtn.addEventListener("click", saveBill);
  printBillBtn.addEventListener("click", printBill);

  // Init
  addItemRow();
  loadBills();
});
