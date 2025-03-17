require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient, PutItemCommand, GetItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const app = express();
const port = process.env.PORT || 3001;

// Configure AWS clients
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Log all requests and errors
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`, {
    headers: req.headers,
    query: req.query,
    body: req.body
  });

  // Capture response
  const oldJson = res.json;
  res.json = function(data) {
    console.log(`[RESPONSE] ${req.method} ${req.path}`, {
      status: res.statusCode,
      data: data
    });
    return oldJson.apply(res, arguments);
  };

  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

app.use(cors());
app.use(express.json());

// API routes
const apiRouter = express.Router();
app.use('/api', apiRouter);

// Then serve static files from the build directory
app.use(express.static('build'));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Generate presigned URL endpoint
apiRouter.post('/generate-presigned-url', async (req, res) => {
  try {
    console.log('Received presigned URL request:', req.body);
    const { recordingId, contentType, residentId, questionTopic } = req.body;
    console.log('Using AWS credentials:', {
      region: process.env.AWS_REGION,
      bucket: process.env.S3_BUCKET_NAME,
      keyId: process.env.AWS_ACCESS_KEY_ID?.slice(0, 5) + '...'
    });
    
    // Get the recording date from the request
    const { recordingDate } = req.body;
    const dateFolder = new Date(recordingDate).toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Organize files by date, resident ID, and topic
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `residents/${residentId}/${dateFolder}/${questionTopic}/${recordingId}.webm`,
      ContentType: contentType,
      Metadata: {
        residentId,
        questionTopic,
        recordingDate
      }
    });

    // Generate pre-signed URL that expires in 15 minutes
    console.log('Generating presigned URL with command:', {
      Bucket: command.input.Bucket,
      Key: command.input.Key,
      ContentType: command.input.ContentType
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    console.log('Generated presigned URL:', url);

    res.json({ url });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    res.status(500).json({ error: 'Failed to generate pre-signed URL' });
  }
});

// Resident endpoints
apiRouter.post('/residents', async (req, res) => {
  try {
    const resident = req.body;
    const command = new PutItemCommand({
      TableName: process.env.DYNAMODB_RESIDENTS_TABLE,
      Item: marshall(resident)
    });
    
    await dynamoClient.send(command);
    res.json({ message: 'Resident saved successfully' });
  } catch (error) {
    console.error('Error saving resident:', error);
    res.status(500).json({ error: 'Failed to save resident' });
  }
});

// Get a single resident
apiRouter.get('/residents/:residentId', async (req, res) => {
  try {
    const { residentId } = req.params;
    console.log('Querying DynamoDB for resident:', residentId);
    
    const command = new GetItemCommand({
      TableName: process.env.DYNAMODB_RESIDENTS_TABLE,
      Key: marshall({ residentId: residentId.toUpperCase() })
    });
    
    const response = await dynamoClient.send(command);
    
    if (!response.Item) {
      return res.status(404).json({ error: 'Resident not found' });
    }
    
    const resident = unmarshall(response.Item);
    res.json(resident);
  } catch (error) {
    console.error('Error fetching resident:', error);
    res.status(500).json({ error: 'Failed to fetch resident' });
  }
});

// Get all residents
apiRouter.get('/residents', async (req, res) => {
  try {
    const command = new ScanCommand({
      TableName: process.env.DYNAMODB_RESIDENTS_TABLE
    });
    
    const response = await dynamoClient.send(command);
    const residents = response.Items.map(item => unmarshall(item));
    res.json(residents);
  } catch (error) {
    console.error('Error fetching residents:', error);
    res.status(500).json({ error: 'Failed to fetch residents' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
