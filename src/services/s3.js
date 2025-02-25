export const generatePresignedUrl = async (recordingId, contentType, residentId, questionTopic, recordingDate) => {
  const response = await fetch('http://localhost:3001/api/generate-presigned-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recordingId,
      contentType,
      residentId,
      questionTopic,
      recordingDate
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate pre-signed URL');
  }

  const { url } = await response.json();
  return url;
};

export const uploadToS3 = async (presignedUrl, blob) => {
  console.log('Attempting to upload to S3:', {
    url: presignedUrl,
    contentType: blob.type,
    blobSize: blob.size
  });

  try {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': blob.type,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('S3 upload failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to upload to S3: ${response.status} ${response.statusText}`);
    }

    console.log('Successfully uploaded to S3');
  } catch (error) {
    console.error('Error during S3 upload:', error);
    throw error;
  }
};
