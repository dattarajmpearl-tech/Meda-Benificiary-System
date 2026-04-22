const express = require("express");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// ===== SERVE FRONTEND =====
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===== USER STORE =====
const users = [
  {
    username: "admin",
    password: bcrypt.hashSync("1234", 10),
    role: "admin"
  }
];

// ===== LOGIN =====
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);
  if (!user) return res.send("User not found");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.send("Wrong password");

  const token = jwt.sign(
    { username: user.username, role: user.role },
    "SECRET_KEY",
    { expiresIn: "2h" }
  );

  res.json({ token });
});

// ===== AUTH MIDDLEWARE =====
function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.send("No token");

  try {
    const decoded = jwt.verify(token, "SECRET_KEY");
    req.user = decoded;
    next();
  } catch {
    res.send("Invalid token");
  }
}

// ===== SUBMIT DATA =====
app.post("/submit", upload.single("pdf"), (req, res) => {

  const record = {
    beneficiary_no: req.body.beneficiary_no,
    beneficiary_name: req.body.beneficiary_name,
    installer_name: req.body.installer_name,
    controller_no: req.body.controller_no,
    pump_no: req.body.pump_no,
    panel_no: req.body.panel_no,
    pdf: req.file ? req.file.filename : null,
    date: new Date()
  };

  let data = [];

  if (fs.existsSync("data.json")) {
    data = JSON.parse(fs.readFileSync("data.json"));
  }

  data.push(record);

  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));

  res.send("✅ Data Saved Successfully");
});

// ===== GET DATA (ADMIN ONLY) =====
app.get("/data", verifyToken, (req, res) => {

  if (req.user.role !== "admin") {
    return res.send("Access denied");
  }

  const data = JSON.parse(fs.readFileSync("data.json"));
  res.json(data);
});

// ===== DOWNLOAD CSV =====
app.get("/download", verifyToken, (req, res) => {

  if (req.user.role !== "admin") {
    return res.send("Access denied");
  }

  const data = JSON.parse(fs.readFileSync("data.json"));

  let csv = "No,Name,Installer,Controller,Pump,Panel,Date\n";

  data.forEach(d => {
    csv += `${d.beneficiary_no},${d.beneficiary_name},${d.installer_name},${d.controller_no},${d.pump_no},${d.panel_no},${d.date}\n`;
  });

  fs.writeFileSync("data.csv", csv);

  res.download("data.csv");
});

app.listen(3000, () => console.log("Server running on port 3000"));