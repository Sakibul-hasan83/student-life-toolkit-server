const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "secret123";

app.use(cors());
app.use(express.json());

// ================== MongoDB Connection ==================
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.f4ofb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1 } });

let routinesCollection;
let plansCollection;
let budgetCollection;
let collectionsCollection;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("studenttoolkits_collections");

    routinesCollection = db.collection("routines");
    plansCollection = db.collection("plans");
    budgetCollection = db.collection("budgets");
    collectionsCollection = db.collection("collections");

    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err);
  }
}

connectDB();

// ================== JWT Middleware ==================
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Forbidden" });
    req.decoded = decoded;
    next();
  });
};

// ================== Routes ==================

// Test Route
app.get('/', (req, res) => res.send("🚀 Server running & DB connected ✅"));

// Generate JWT
app.post('/jwt', (req, res) => {
  const { uid, email } = req.body;
  if (!uid) return res.status(400).json({ message: "UID missing" });
  const token = jwt.sign({ uid, email }, JWT_SECRET, { expiresIn: "2h" });
  res.json({ token });
});

// ================== Routine Tracker ==================

// Get all routines
app.get('/routines', async (req, res) => {
  try {
    const routines = await routinesCollection.find({}).toArray();
    res.json(routines);
  } catch (err) {
    res.status(500).json({ message: "Error fetching routines", error: err });
  }
});

// Add routine
app.post('/routines', async (req, res) => {
  try {
    const newRoutine = { ...req.body, createdAt: new Date() };
    const result = await routinesCollection.insertOne(newRoutine);
    res.status(201).json({ _id: result.insertedId, ...newRoutine });
  } catch (err) {
    res.status(500).json({ message: "Error adding routine", error: err });
  }
});

// Delete all routines
app.delete('/routines', async (req, res) => {
  try {
    await routinesCollection.deleteMany({});
    res.json({ message: "All routines cleared" });
  } catch (err) {
    res.status(500).json({ message: "Error clearing routines", error: err });
  }
});

// ================== Study Planner ==================

// Get all study plans
app.get('/plans', async (req, res) => {
  try {
    const plans = await plansCollection.find({}).toArray();
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: "Error fetching plans", error: err });
  }
});

// Add a new study plan
app.post('/plans', async (req, res) => {
  try {
    const newPlan = { ...req.body, createdAt: new Date() };
    const result = await plansCollection.insertOne(newPlan);
    res.status(201).json({ _id: result.insertedId, ...newPlan });
  } catch (err) {
    res.status(500).json({ message: "Error adding plan", error: err });
  }
});

// Delete a study plan
app.delete('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await plansCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting plan", error: err });
  }
});

// ================== Budget Tracker ==================

// Add transaction
app.post('/budgettracker', verifyJWT, async (req, res) => {
  try {
    const { uid, type, amount } = req.body;
    if (uid !== req.decoded.uid) return res.status(403).json({ message: "Forbidden" });
    if (!type || !amount) return res.status(400).json({ message: "Missing fields" });

    const newEntry = { uid, type, amount: Number(amount), createdAt: new Date() };
    const result = await budgetCollection.insertOne(newEntry);
    res.status(201).json({ _id: result.insertedId, ...newEntry });
  } catch (err) {
    res.status(500).json({ message: "Error adding budget", error: err });
  }
});

// Get all transactions for a user
app.get('/budgettracker/:uid', verifyJWT, async (req, res) => {
  try {
    const uid = req.params.uid;
    if (uid !== req.decoded.uid) return res.status(403).json({ message: "Forbidden" });
    const result = await budgetCollection.find({ uid }).toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Error fetching budgets", error: err });
  }
});

// ================== Practice Questions ==================
app.get('/allquestions', async (req, res) => {
  try {
    const questions = await collectionsCollection.find({}).toArray();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: "Error fetching questions", error: err });
  }
});

// ================== Start Server ==================
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
