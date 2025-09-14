// Test script for prescription file upload
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testPrescriptionUpload() {
  const API_URL = 'http://localhost:5555';
  
  console.log('🔍 Testing Prescription Upload Flow...\n');
  
  try {
    // Step 1: Get CSRF Token
    console.log('1️⃣ Getting CSRF token...');
    const csrfResponse = await fetch(`${API_URL}/api/prescriptions/csrf`, {
      credentials: 'include',
      headers: {
        'Cookie': 'your-session-cookie-here' // You'll need to get this from browser
      }
    });
    
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken || csrfResponse.headers.get('X-CSRF-Token');
    console.log('✅ CSRF Token obtained:', csrfToken ? 'Yes' : 'No');
    
    // Step 2: Create a prescription
    console.log('\n2️⃣ Creating prescription record...');
    const prescriptionData = {
      orderId: 'cmfdxhpsw000eu3fswc3uwbpa', // Use one of the existing order IDs
      notes: 'Test prescription upload',
      prescribedBy: 'Dr. Test',
      prescribedDate: new Date().toISOString()
    };
    
    const createResponse = await fetch(`${API_URL}/api/prescriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        'Cookie': 'your-session-cookie-here'
      },
      body: JSON.stringify(prescriptionData),
      credentials: 'include'
    });
    
    const createResult = await createResponse.json();
    console.log('Create Response:', createResult);
    
    if (!createResult.success) {
      console.error('❌ Failed to create prescription:', createResult.error);
      return;
    }
    
    const prescriptionId = createResult.data?.prescription?.id;
    console.log('✅ Prescription created with ID:', prescriptionId);
    
    // Step 3: Create a test file
    console.log('\n3️⃣ Creating test file...');
    const testContent = Buffer.from('Test prescription content - PDF placeholder', 'utf-8');
    
    // Step 4: Upload file
    console.log('\n4️⃣ Uploading file...');
    const formData = new FormData();
    formData.append('file', testContent, {
      filename: 'test-prescription.pdf',
      contentType: 'application/pdf'
    });
    
    const uploadResponse = await fetch(`${API_URL}/api/prescriptions/${prescriptionId}/upload`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken,
        'Cookie': 'your-session-cookie-here',
        ...formData.getHeaders()
      },
      body: formData,
      credentials: 'include'
    });
    
    const uploadResult = await uploadResponse.json();
    console.log('Upload Response:', uploadResult);
    
    if (uploadResult.success) {
      console.log('✅ File uploaded successfully!');
      console.log('File URL:', uploadResult.data?.fileUrl);
    } else {
      console.error('❌ Upload failed:', uploadResult.error);
    }
    
    // Step 5: Verify in database
    console.log('\n5️⃣ Checking database...');
    // This would be done via Supabase query
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Check if form-data is installed
try {
  require('form-data');
  testPrescriptionUpload();
} catch (e) {
  console.log('Installing form-data package...');
  require('child_process').execSync('npm install form-data', { stdio: 'inherit' });
  testPrescriptionUpload();
}
