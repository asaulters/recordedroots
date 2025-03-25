require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

// Ensure we use the correct table name that matches the IAM policy
const DYNAMODB_TABLE = 'RecordedRootsResidents';

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Log startup configuration
console.log('Server starting with configuration:', {
  region: process.env.AWS_REGION,
  tableName: DYNAMODB_TABLE,
  envTableName: process.env.DYNAMODB_RESIDENTS_TABLE,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ? '****' + process.env.AWS_ACCESS_KEY_ID.slice(-4) : 'undefined'
});

app.use(cors());
// Increase JSON payload limit to handle base64-encoded videos
app.use(express.json({ limit: '50mb' }));

// Serve static files from the build directory
app.use(express.static('build'));

// Generate presigned URL endpoint
app.post('/api/generate-presigned-url', async (req, res) => {
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

// Upload to S3 endpoint (to avoid CORS issues)
app.post('/api/upload-to-s3', async (req, res) => {
  try {
    console.log('Received S3 upload request');
    const { s3Key, contentType, base64Data } = req.body;
    
    if (!s3Key || !contentType || !base64Data) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    console.log('Uploading to S3:', {
      bucket: process.env.S3_BUCKET_NAME,
      key: s3Key,
      contentType,
      dataSize: base64Data.length
    });
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType
    });
    
    await s3Client.send(command);
    console.log('Successfully uploaded to S3');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error uploading to S3:', error);
    res.status(500).json({ 
      error: 'Failed to upload to S3',
      details: error.message
    });
  }
});

// Resident endpoints
app.post('/api/residents', async (req, res) => {
  try {
    const resident = req.body;
    const command = new PutItemCommand({
      TableName: DYNAMODB_TABLE,
      Item: marshall(resident)
    });
    
    await dynamoClient.send(command);
    res.json({ message: 'Resident saved successfully' });
  } catch (error) {
    console.error('Error saving resident:', error);
    res.status(500).json({ error: 'Failed to save resident' });
  }
});

// Debug endpoint to directly query DynamoDB
app.get('/api/debug/resident/:residentId', async (req, res) => {
  try {
    const { residentId } = req.params;
    console.log('Debug: Querying DynamoDB for resident:', residentId);
    
    // Log environment variables (redacted for security)
    console.log('Debug: Environment variables:', {
      AWS_REGION: process.env.AWS_REGION,
      DYNAMODB_RESIDENTS_TABLE: process.env.DYNAMODB_RESIDENTS_TABLE,
      DYNAMODB_TABLE: DYNAMODB_TABLE,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? '****' + process.env.AWS_ACCESS_KEY_ID.slice(-4) : 'undefined',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? '****' : 'undefined'
    });
    
    const command = new GetItemCommand({
      TableName: DYNAMODB_TABLE,
      Key: marshall({ residentId: residentId.toUpperCase() })
    });
    
    console.log('Debug: Executing DynamoDB command:', JSON.stringify(command.input, null, 2));
    
    const response = await dynamoClient.send(command);
    console.log('Debug: DynamoDB response:', JSON.stringify(response, null, 2));
    
    if (!response.Item) {
      console.log('Debug: No resident found in DynamoDB');
      return res.status(404).json({ 
        error: 'Resident not found',
        debugInfo: {
          queriedId: residentId.toUpperCase(),
          tableName: DYNAMODB_TABLE
        }
      });
    }
    
    const resident = unmarshall(response.Item);
    console.log('Debug: Found resident:', resident);
    res.json(resident);
  } catch (error) {
    console.error('Error fetching resident:', error);
    // Provide more detailed error information
    const errorDetails = {
      message: error.message,
      name: error.name,
      code: error.code,
      requestId: error.$metadata?.requestId,
      cfId: error.$metadata?.cfId,
      statusCode: error.$metadata?.httpStatusCode
    };
    console.error('Error details:', errorDetails);
    res.status(500).json({ 
      error: 'Failed to fetch resident',
      details: errorDetails
    });
  }
});

app.get('/api/debug/residents', async (req, res) => {
  console.log('Debug: Scanning DynamoDB for all residents');
  try {
    // Log environment variables (redacted for security)
    console.log('Debug: Environment variables:', {
      AWS_REGION: process.env.AWS_REGION,
      DYNAMODB_RESIDENTS_TABLE: process.env.DYNAMODB_RESIDENTS_TABLE,
      DYNAMODB_TABLE: DYNAMODB_TABLE,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? '****' + process.env.AWS_ACCESS_KEY_ID.slice(-4) : 'undefined',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? '****' : 'undefined'
    });
    
    const command = new ScanCommand({
      TableName: DYNAMODB_TABLE
    });
    
    console.log('Debug: Executing DynamoDB command:', JSON.stringify(command.input, null, 2));
    
    const response = await dynamoClient.send(command);
    const residents = response.Items.map(item => unmarshall(item));
    console.log('Debug: Found residents:', residents);
    
    res.json({
      count: residents.length,
      residents: residents,
      tableName: DYNAMODB_TABLE
    });
  } catch (error) {
    console.error('Error fetching residents:', error);
    // Provide more detailed error information
    const errorDetails = {
      message: error.message,
      name: error.name,
      code: error.code,
      requestId: error.$metadata?.requestId,
      cfId: error.$metadata?.cfId,
      statusCode: error.$metadata?.httpStatusCode
    };
    console.error('Error details:', errorDetails);
    res.status(500).json({ 
      error: 'Failed to fetch residents',
      details: errorDetails
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
