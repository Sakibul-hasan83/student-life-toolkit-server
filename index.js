const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.f4ofb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1 } });

let budgetCollection;

async function run() {
  try {
    await client.connect();
    const db = client.db("studenttoolkits_collections");
    budgetCollection = db.collection("budgets");
    console.log("MongoDB Connected ✅");

    // JWT endpoint
    app.post('/jwt', (req, res) => {
      const { uid, email } = req.body;
      const token = jwt.sign({ uid, email }, process.env.JWT_SECRET, { expiresIn: '1d' });
      res.json({ token });
    });

    // Add transaction
    app.post('/budgettracker', async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
          if (err) return res.status(403).json({ message: "Forbidden" });

          const { uid, type, amount } = req.body;
          const newEntry = { uid, type, amount: Number(amount), createdAt: new Date() };
          const result = await budgetCollection.insertOne(newEntry);
          res.status(201).json({ message: "Saved", result });
        });
      } catch (err) {
        res.status(500).json({ message: "Error saving data", err });
      }
    });

    // Get transactions by uid
    app.get('/budgettracker/:uid', async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
          if (err) return res.status(403).json({ message: "Forbidden" });

          const uid = req.params.uid;
          const data = await budgetCollection.find({ uid }).toArray();
          res.status(200).json(data);
        });
      } catch (err) {
        res.status(500).json({ message: "Error fetching data", err });
      }
    });

  } finally {
    // keep connection open
  }
}
run().catch(console.dir);

app.get('/', (req, res) => res.send('Server running'));
app.listen(port, () => console.log(`Server running on port ${port}`));
