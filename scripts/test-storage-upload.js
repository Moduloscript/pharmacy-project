#!/usr/bin/env node
// Test storage upload through S3-compatible API

const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

async function testStorage() {
  console.log('🔍 Testing Storage Upload System\n');
  
  // Configuration from environment
  const config = {
    endpoint: process.env.S3_ENDPOINT || 'https://ehuuqltrlfcmrsiwgrml.supabase.co/storage/v1/s3',
    region: process.env.S3_REGION || 'eu-west-2',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || 'f3742a51c4e3571ccca6716ba1113c5f',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '5c7a693c6ae1e236a0050411d01eedd216933614a4b4b34836ad81adcdb7d6f7'
    }
  };
  
  console.log('📋 Configuration:');
  console.log(`  - Endpoint: ${config.endpoint}`);
  console.log(`  - Region: ${config.region}`);
  console.log(`  - Access Key: ${config.credentials.accessKeyId.substring(0, 10)}...`);
  console.log('');
  
  // Create S3 client
  const s3Client = new S3Client({
    ...config,
    forcePathStyle: true
  });
  
  try {
    // Get bucket name from environment or fallback
    const prescriptionsBucket = process.env.NEXT_PUBLIC_PRESCRIPTIONS_BUCKET_NAME || 'prescriptions';
    
    // 1. List objects in prescriptions bucket
    console.log(`1️⃣ Listing objects in ${prescriptionsBucket} bucket...`);
    const listCommand = new ListObjectsV2Command({
      Bucket: prescriptionsBucket,
      MaxKeys: 10
    });
    
    const listResponse = await s3Client.send(listCommand);
    console.log(`✅ Found ${listResponse.KeyCount || 0} objects in ${prescriptionsBucket} bucket`);
    if (listResponse.Contents) {
      listResponse.Contents.forEach(obj => {
        console.log(`   - ${obj.Key} (${obj.Size} bytes)`);
      });
    }
    
    // 2. Test creating a signed upload URL
    console.log('\n2️⃣ Creating signed upload URL...');
    const testKey = `test/upload-test-${Date.now()}.txt`;
    const putCommand = new PutObjectCommand({
      Bucket: prescriptionsBucket,
      Key: testKey,
      ContentType: 'text/plain'
    });
    
    const signedUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 60 });
    console.log('✅ Signed URL created successfully');
    console.log(`   URL: ${signedUrl.substring(0, 100)}...`);
    
    // 3. Test uploading with the signed URL
    console.log('\n3️⃣ Testing upload with signed URL...');
    const testContent = 'Test prescription upload content';
    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      body: testContent,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
    
    if (uploadResponse.ok) {
      console.log('✅ Test upload successful!');
    } else {
      console.log('❌ Upload failed:', uploadResponse.status, uploadResponse.statusText);
      const errorText = await uploadResponse.text();
      console.log('Error details:', errorText);
    }
    
    // 4. Verify the upload
    console.log('\n4️⃣ Verifying upload...');
    const verifyCommand = new ListObjectsV2Command({
      Bucket: prescriptionsBucket,
      Prefix: 'test/'
    });
    
    const verifyResponse = await s3Client.send(verifyCommand);
    const uploaded = verifyResponse.Contents?.find(obj => obj.Key === testKey);
    if (uploaded) {
      console.log('✅ File verified in bucket');
    } else {
      console.log('⚠️ File not found in bucket listing');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.Code) {
      console.error('   Error Code:', error.Code);
    }
    if (error.$metadata) {
      console.error('   Status Code:', error.$metadata.httpStatusCode);
    }
  }
}

// Load environment variables
require('dotenv').config({ path: '.env' });

// Run test
testStorage().then(() => {
  console.log('\n✨ Test complete!');
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});