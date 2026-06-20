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

    app.get('/api/funding', async (req, res) => {
      try {
        const filter = {};
        if (req.query.status) {
          filter.status = req.query.status;
        }
        const requests = await db.collection('funding').find(filter).toArray();
        res.json(requests);
      } catch (error) {
        res.status(500).json({ message: 'Server error' });
      }
    });


    app.get('/api/my-donation-requests', async (req, res) => {
      try {
        const db = client.db('BloodBridge');
        const email = req.query.email;
        if (!email)
          return res
            .status(400)
            .json({ message: 'Email query param is required' });

        const requests = await db
          .collection('donationrequests')
          .find({ requesterEmail: email })
          .sort({ createdAt: -1 }) // most recent first
          .toArray();
        res.json(requests);
      } catch (error) {
        res.status(500).json({ message: 'Server error' });
      }
    });


    app.put('/api/donation-requests/:id', async (req, res) => {
      try {
        const db = client.db('BloodBridge');
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'Invalid ID format' });
        }

        // Fields that can be updated
        const {
          recipientName,
          district,
          upazila,
          hospitalName,
          fullAddress,
          bloodGroup,
          donationDate,
          donationTime,
          requestMessage,
          status, 
        } = req.body;

       
        const updateFields = {};
        if (recipientName !== undefined)
          updateFields.recipientName = recipientName;
        if (district !== undefined) updateFields.district = district;
        if (upazila !== undefined) updateFields.upazila = upazila;
        if (hospitalName !== undefined)
          updateFields.hospitalName = hospitalName;
        if (fullAddress !== undefined) updateFields.fullAddress = fullAddress;
        if (bloodGroup !== undefined) updateFields.bloodGroup = bloodGroup;
        if (donationDate !== undefined)
          updateFields.donationDate = donationDate;
        if (donationTime !== undefined)
          updateFields.donationTime = donationTime;
        if (requestMessage !== undefined)
          updateFields.requestMessage = requestMessage;
        if (status !== undefined) updateFields.status = status;

        const result = await db
          .collection('donationrequests')
          .updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Request not found' });
        }

        res.json({ success: true, message: 'Request updated' });
      } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    app.delete('/api/donation-requests/:id', async (req, res) => {
      try {
        const db = client.db('BloodBridge');
        const { id } = req.params;
        if (!ObjectId.isValid(id))
          return res.status(400).json({ message: 'Invalid ID' });

        const result = await db
          .collection('donationrequests')
          .deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0)
          return res.status(404).json({ message: 'Request not found' });

        res.json({ success: true, message: 'Deleted' });
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

    app.post('/api/create-request', async (req, res) => {
      try {
        const {
          recipientName,
          district,
          upazila,
          bloodGroup,
          donationDate,
          donationTime,
          requestMessage,
          hospitalName,
          fullAddress,
          requesterName,
          requesterEmail,
        } = req.body;

        if (
          !recipientName ||
          !district ||
          !upazila ||
          !bloodGroup ||
          !donationDate ||
          !donationTime ||
          !requesterName ||
          !requesterEmail
        ) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        const validBloodGroups = [
          'A+',
          'A-',
          'B+',
          'B-',
          'AB+',
          'AB-',
          'O+',
          'O-',
        ];
        if (!validBloodGroups.includes(bloodGroup)) {
          return res.status(400).json({ message: 'Invalid blood group' });
        }

        const newRequest = {
          recipientName,
          district,
          upazila,
          bloodGroup,
          donationDate,
          donationTime,
          requestMessage: requestMessage || '',
          hospitalName: hospitalName || '',
          fullAddress: fullAddress || '',
          status: 'pending',
          requesterName,
          requesterEmail,
          createdAt: new Date(),
        };

        const result = await db
          .collection('donationrequests')
          .insertOne(newRequest);

        res.status(201).json({
          success: true,
          message: 'Donation request created successfully',
          id: result.insertedId,
        });
      } catch (error) {
        console.error('Error creating request:', error);
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
