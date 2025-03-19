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

// Log startup configuration
console.log('Starting server with configuration:', {
  port,
  aws_region: process.env.AWS_REGION,
  dynamo_table: process.env.DYNAMODB_RESIDENTS_TABLE,
  s3_bucket: process.env.S3_BUCKET_NAME
});

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

app.use(cors());
app.use(express.json());

// API routes must come before static files and catch-all
const apiRouter = express.Router();

// API-specific middleware
apiRouter.use(cors({
  origin: '*',  // In production, you might want to restrict this
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Log all API requests specifically
apiRouter.use((req, res, next) => {
  console.log('[API REQUEST]', {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body,
    query: req.query
  });
  next();
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
    console.log('Creating new resident:', req.body);
    const resident = req.body;
    const command = new PutItemCommand({
      TableName: process.env.DYNAMODB_RESIDENTS_TABLE,
      Item: marshall(resident)
    });
    
    await dynamoClient.send(command);
    console.log('Successfully created resident in DynamoDB');
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
    
    console.log('DynamoDB command:', command);
    const response = await dynamoClient.send(command);
    console.log('DynamoDB response:', response);
    
    if (!response.Item) {
      console.log('No resident found in DynamoDB');
      return res.status(404).json({ error: 'Resident not found' });
    }
    
    const resident = unmarshall(response.Item);
    console.log('Found resident:', resident);
    res.json(resident);
  } catch (error) {
    console.error('Error fetching resident:', error);
    res.status(500).json({ error: 'Failed to fetch resident' });
  }
});

// Get all residents
apiRouter.get('/residents', async (req, res) => {
  try {
    console.log('Scanning DynamoDB for all residents');
    const command = new ScanCommand({
      TableName: process.env.DYNAMODB_RESIDENTS_TABLE
    });
    
    console.log('DynamoDB command:', command);
    const response = await dynamoClient.send(command);
    console.log('DynamoDB response:', response);
    
    const residents = response.Items.map(item => unmarshall(item));
    console.log('Found residents:', residents);
    res.json(residents);
  } catch (error) {
    console.error('Error fetching residents:', error);
    res.status(500).json({ error: 'Failed to fetch residents' });
  }
});

// Mount API routes
app.use('/api', apiRouter);

// Then static files
const buildPath = path.join(__dirname, 'build');
console.log('Serving static files from:', buildPath);
app.use(express.static(buildPath));

// Then 404 logger
app.use((req, res, next) => {
  if (!res.headersSent) {
    console.log(`404: ${req.method} ${req.url}`);
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Finally, the catch-all route for React
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'build', 'index.html');
  console.log('Serving index.html from:', indexPath);
  res.sendFile(indexPath);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('API routes available:');
  console.log('- POST /api/generate-presigned-url');
  console.log('- POST /api/residents');
  console.log('- GET /api/residents/:residentId');
  console.log('- GET /api/residents');
});
