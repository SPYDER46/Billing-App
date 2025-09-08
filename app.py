from flask import Flask, render_template, request, jsonify
from datetime import datetime
import sqlite3
import json

app = Flask(__name__)

def init_db():
    conn = sqlite3.connect("bills.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer TEXT,
        items TEXT,
        grandTotal REAL,
        paidAmount REAL,
        pendingAmount REAL,
        date TEXT
    )''')
    conn.commit()
    conn.close()


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/save", methods=["POST"])
def save_bill():
    data = request.json
    customer = data["customer"]
    items = json.dumps(data["items"])  
    grand_total = data["grandTotal"]
    paid_amount = data["paidAmount"]
    pending_amount = data["pendingAmount"]

    con = sqlite3.connect("bills.db")
    cur = con.cursor()
    cur.execute("""
        INSERT INTO bills (customer, items, grandTotal, paidAmount, pendingAmount, date)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
    """, (customer, items, grand_total, paid_amount, pending_amount))
    con.commit()

    new_id = cur.lastrowid
    con.close()

    return jsonify({
        "status": "success",
        "bill": {
            "id": new_id,
            "customer": customer,
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "grandTotal": grand_total,
            "paidAmount": paid_amount,
            "pendingAmount": pending_amount
        }
    })

@app.route("/bill/<int:bill_id>")
def get_bill(bill_id):
    conn = sqlite3.connect("bills.db")
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM bills WHERE id=?", (bill_id,))
    row = c.fetchone()
    conn.close()
    if row:
        bill = dict(row)
        import json
        bill["items"] = json.loads(bill["items"])
        return jsonify(bill)
    return jsonify({"status":"error","message":"Bill not found"}), 404

@app.route("/bills")
def get_bills():
    conn = sqlite3.connect("bills.db")
    conn.row_factory = sqlite3.Row  # make rows dict-like
    c = conn.cursor()
    c.execute("SELECT * FROM bills ORDER BY id DESC")
    rows = c.fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


@app.route("/delete/<int:bill_id>", methods=["DELETE"])
def delete_bill(bill_id):
    conn = sqlite3.connect("bills.db")
    c = conn.cursor()
    c.execute("DELETE FROM bills WHERE id=?", (bill_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "deleted", "id": bill_id})

@app.route("/markPaid/<int:bill_id>", methods=["PUT"])
def mark_paid(bill_id):
    conn = sqlite3.connect("bills.db")
    c = conn.cursor()
    c.execute("UPDATE bills SET paidAmount = grandTotal, pendingAmount = 0 WHERE id = ?", (bill_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})

if __name__ == "__main__":
    init_db()
    app.run(debug=True)
