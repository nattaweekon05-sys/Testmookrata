const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "admin123";

const db = new Database("restaurant.db");
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  order_type TEXT NOT NULL,
  address TEXT DEFAULT '',
  note TEXT DEFAULT '',
  items TEXT NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'รอรับออเดอร์',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/menu", (req, res) => {
  res.json([
    {id:1,name:"ชุดเล็ก",price:250,category:"หมูกระทะ",emoji:"🍲",desc:"ชุดหมูกระทะสำหรับ 1–2 ท่าน"},
    {id:2,name:"ชุดใหญ่",price:350,category:"หมูกระทะ",emoji:"🍲",desc:"ชุดหมูกระทะสำหรับ 2–3 ท่าน"},
    {id:3,name:"ชุดจัมโบ้",price:500,category:"หมูกระทะ",emoji:"🍲",desc:"ชุดใหญ่พิเศษสำหรับครอบครัว"},
    {id:4,name:"หมูสามชั้น",price:80,category:"ของเพิ่ม",emoji:"🥓",desc:"หมูสามชั้นสไลซ์"},
    {id:5,name:"หมูนุ่ม",price:80,category:"ของเพิ่ม",emoji:"🥩",desc:"หมูนุ่มหมักสูตรของร้าน"},
    {id:6,name:"ตับ",price:70,category:"ของเพิ่ม",emoji:"🍖",desc:"ตับสดสไลซ์"},
    {id:7,name:"กุ้ง",price:50,category:"ของเพิ่ม",emoji:"🦐",desc:"กุ้งสด"},
    {id:8,name:"ไข่ไก่",price:10,category:"ของเพิ่ม",emoji:"🥚",desc:"ไข่ไก่สด"},
    {id:9,name:"ผักสด",price:30,category:"ของเพิ่ม",emoji:"🥬",desc:"ผักสดสำหรับหมูกระทะ"},
    {id:10,name:"น้ำอัดลม",price:20,category:"เครื่องดื่ม",emoji:"🥤",desc:"เครื่องดื่มเย็น ๆ"},
    {id:11,name:"น้ำเปล่า",price:10,category:"เครื่องดื่ม",emoji:"💧",desc:"น้ำดื่มแช่เย็น"}
  ]);
});

app.post("/api/orders", (req, res) => {
  const {customer_name, phone, order_type, address="", note="", items} = req.body;
  if (!customer_name || !phone || !order_type || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({error:"ข้อมูลออเดอร์ไม่ครบ"});
  }

  const total = items.reduce((sum, x) => sum + (Number(x.price) * Number(x.quantity)), 0);
  const stmt = db.prepare(`
    INSERT INTO orders (customer_name, phone, order_type, address, note, items, total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    customer_name.trim(), phone.trim(), order_type,
    address.trim(), note.trim(), JSON.stringify(items), total
  );

  res.json({ok:true, order_id:result.lastInsertRowid, total});
});

app.get("/api/orders/track", (req, res) => {
  const id = Number(req.query.id);
  const phone = String(req.query.phone || "").trim();
  if (!id || !phone) return res.status(400).json({error:"กรุณากรอกเลขออเดอร์และเบอร์โทร"});

  const row = db.prepare("SELECT id, customer_name, phone, order_type, address, note, items, total, status, created_at FROM orders WHERE id=? AND phone=?").get(id, phone);
  if (!row) return res.status(404).json({error:"ไม่พบรายการ กรุณาตรวจสอบเลขออเดอร์และเบอร์โทร"});
  row.items = JSON.parse(row.items);
  res.json(row);
});

app.get("/api/orders", (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(401).json({error:"Unauthorized"});
  const rows = db.prepare("SELECT * FROM orders ORDER BY id DESC").all();
  res.json(rows.map(r => ({...r, items: JSON.parse(r.items)})));
});

app.patch("/api/orders/:id", (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(401).json({error:"Unauthorized"});
  const allowed = ["รอรับออเดอร์","กำลังเตรียมอาหาร","พร้อมรับ/กำลังจัดส่ง","เสร็จสิ้น","ยกเลิก"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({error:"สถานะไม่ถูกต้อง"});
  db.prepare("UPDATE orders SET status=? WHERE id=?").run(req.body.status, req.params.id);
  res.json({ok:true});
});

app.get("/admin", (req,res) => {
  res.sendFile(path.join(__dirname,"public","admin.html"));
});

app.listen(PORT, () => console.log(`Restaurant website running on port ${PORT}`));
