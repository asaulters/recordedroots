require('dotenv').config();
const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');

// Configure AWS client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

async function createResidentsTable() {
  console.log('Creating DynamoDB table:', process.env.DYNAMODB_RESIDENTS_TABLE);
  
  const params = {
    TableName: process.env.DYNAMODB_RESIDENTS_TABLE,
    KeySchema: [
      { AttributeName: 'residentId', KeyType: 'HASH' } // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: 'residentId', AttributeType: 'S' }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };

  try {
    const data = await dynamoClient.send(new CreateTableCommand(params));
    console.log('Table created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error creating table:', error);
    throw error;
  }
}

createResidentsTable()
  .then(() => console.log('Done!'))
  .catch(err => console.error('Failed:', err));
