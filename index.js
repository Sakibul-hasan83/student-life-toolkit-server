const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "secret123";

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.f4ofb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1 } });

let budgetCollection;
let questionsCollection; // add questions collection
const database = client.db("studenttoolkits_collections").collection("collections")



async function run() {
  try {
    await client.connect();
    const db = client.db("studenttoolkits_collections");
    budgetCollection = db.collection("budgets");
    questionsCollection = db.collection("questions"); // initialize questions
    console.log("MongoDB Connected ✅");

    // Generate JWT
    app.post('/jwt', (req, res) => {
      const { uid, email } = req.body;
      if (!uid) return res.status(400).json({ message: "UID missing" });
      const token = jwt.sign({ uid, email }, JWT_SECRET, { expiresIn: "2h" });
      res.json({ token });
    });

    // JWT Middleware
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

    // POST: Add transaction
    app.post('/budgettracker', verifyJWT, async (req, res) => {
      const { uid, type, amount } = req.body;
      if (uid !== req.decoded.uid) return res.status(403).json({ message: "Forbidden" });
      if (!type || !amount) return res.status(400).json({ message: "Missing fields" });

      const newEntry = { uid, type, amount: Number(amount), createdAt: new Date() };
      const result = await budgetCollection.insertOne(newEntry);
      res.status(201).json(result);
    });

    // GET: Get all transactions of a user
    app.get('/budgettracker/:uid', verifyJWT, async (req, res) => {
      const uid = req.params.uid;
      if (uid !== req.decoded.uid) return res.status(403).json({ message: "Forbidden" });
      const result = await budgetCollection.find({ uid }).toArray();
      res.json(result);
    });

    // **GET: Fetch all questions**
    // MongoDB
const database = client.db("studenttoolkits_collections").collection("collections"); // your collection

// GET: Fetch all questions
app.get('/allquestions', async (req, res) => {
  try {
    const questions = await database.find({}).toArray(); // use database variable
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: "Error fetching questions", err });
  }
});


  } finally {
    // keep connection open
  }
}
run().catch(console.dir);

app.get('/', (req, res) => res.send("Server running"));
app.listen(port, () => console.log(`Server running on port ${port}`));
