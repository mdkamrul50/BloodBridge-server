// server.js
const express = require('express');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb'); // ✅ ObjectId যোগ
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
   
    await client.connect();
    console.log('Connected to MongoDB successfully');

    const db = client.db('BloodBridge');

    // GET all requests with optional status filter
    app.get('/api/donation-requests', async (req, res) => {
      try {
        const filter = {};
        if (req.query.status) {
          filter.status = req.query.status;
        }
        const requests = await db
          .collection('donationrequests')
          .find(filter)
          .toArray();
        res.json(requests);
      } catch (error) {
        res.status(500).json({ message: 'Server error' });
      }
    });

    // GET single request by ID (ObjectId)
    app.get('/api/donation-requests/:id', async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'Invalid ID format' });
        }

        const request = await db.collection('donationrequests').findOne({
          _id: new ObjectId(id),
        });

        if (!request) {
          return res.status(404).json({ message: 'Request not found' });
        }

        res.json(request);
      } catch (error) {
        console.error('Error fetching request:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });


    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

run();
