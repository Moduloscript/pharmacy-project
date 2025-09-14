#!/usr/bin/env node
// Diagnostic script for prescription upload issues

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

// Use service role key if available, otherwise anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

async function diagnose() {
  console.log('🔍 Diagnosing Prescription Upload System\n');
  
  // Get bucket name from environment
  const prescriptionsBucket = process.env.NEXT_PUBLIC_PRESCRIPTIONS_BUCKET_NAME || 'prescriptions';
  
  console.log('📋 Environment:');
  console.log(`  - Supabase URL: ${SUPABASE_URL}`);
  console.log(`  - Using: ${SUPABASE_SERVICE_KEY ? 'Service Role Key' : 'Anon Key'}`);
  console.log(`  - Prescriptions Bucket: ${prescriptionsBucket}`);
  console.log('');

  try {
    // 1. Check storage buckets
    console.log('1️⃣ Checking Storage Buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
    } else {
      console.log('✅ Found buckets:', buckets.map(b => b.name).join(', '));
      
      const bucket = buckets.find(b => b.name === prescriptionsBucket);
      if (bucket) {
        console.log(`✅ ${prescriptionsBucket} bucket exists`);
        console.log(`   - Public: ${bucket.public}`);
      } else {
        console.log(`❌ ${prescriptionsBucket} bucket not found`);
      }
    }

    // 2. Check recent prescriptions
    console.log('\n2️⃣ Checking Recent Prescriptions...');
    const { data: prescriptions, error: prescriptionsError } = await supabase
      .from('prescription')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(5);
    
    if (prescriptionsError) {
      console.error('❌ Error fetching prescriptions:', prescriptionsError);
    } else {
      console.log(`✅ Found ${prescriptions.length} recent prescriptions`);
      prescriptions.forEach((p, i) => {
        console.log(`\n   Prescription ${i + 1}:`);
        console.log(`   - ID: ${p.id}`);
        console.log(`   - Order ID: ${p.orderId}`);
        console.log(`   - Status: ${p.status}`);
        console.log(`   - Image URL: ${p.imageUrl || 'None'}`);
        console.log(`   - Document Key: ${p.documentKey || 'None'}`);
        console.log(`   - Created: ${p.createdAt}`);
      });
    }

    // 3. Check storage files
    console.log('\n3️⃣ Checking Storage Files...');
    const { data: files, error: filesError } = await supabase.storage
      .from(prescriptionsBucket)
      .list('', {
        limit: 10,
        offset: 0,
      });
    
    if (filesError) {
      console.error('❌ Error listing files:', filesError);
    } else {
      console.log(`✅ Found ${files.length} files in ${prescriptionsBucket} bucket`);
      files.forEach((f, i) => {
        console.log(`   ${i + 1}. ${f.name} (${(f.metadata?.size / 1024).toFixed(2)} KB)`);
      });
    }

    // 4. Test file upload capability
    console.log('\n4️⃣ Testing Upload Capability...');
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = new Blob(['Test prescription upload'], { type: 'text/plain' });
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(prescriptionsBucket)
      .upload(testFileName, testContent, {
        upsert: true,
      });
    
    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
    } else {
      console.log('✅ Test upload successful:', uploadData.path);
      
      // Try to get signed URL
      const { data: urlData, error: urlError } = await supabase.storage
        .from(prescriptionsBucket)
        .createSignedUrl(testFileName, 60);
      
      if (urlError) {
        console.error('❌ Failed to create signed URL:', urlError);
      } else {
        console.log('✅ Signed URL created successfully');
      }
      
      // Clean up test file
      await supabase.storage.from(prescriptionsBucket).remove([testFileName]);
      console.log('🧹 Test file cleaned up');
    }

    // 5. Check RLS policies
    console.log('\n5️⃣ Checking RLS Policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies_for_table', { 
        schema_name: 'storage', 
        table_name: 'objects' 
      })
      .select('*');
    
    if (policiesError) {
      console.log('⚠️  Could not check RLS policies (requires admin access)');
    } else if (policies && policies.length > 0) {
      console.log(`✅ Found ${policies.length} RLS policies on storage.objects`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Add RPC function if it doesn't exist
async function setupRPCFunction() {
  const createFunction = `
    CREATE OR REPLACE FUNCTION get_policies_for_table(schema_name text, table_name text)
    RETURNS TABLE(policyname text, cmd text, qual text, with_check text)
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        pol.policyname::text,
        pol.cmd::text,
        pol.qual::text,
        pol.with_check::text
      FROM pg_policies pol
      WHERE pol.schemaname = schema_name
        AND pol.tablename = table_name;
    END;
    $$;
  `;
  
  try {
    await supabase.rpc('query', { query: createFunction });
  } catch (e) {
    // Function might already exist
  }
}

// Run diagnostics
diagnose().then(() => {
  console.log('\n✨ Diagnosis complete!');
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
