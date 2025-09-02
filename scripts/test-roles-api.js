#!/usr/bin/env node

/**
 * Test script for the enhanced RBAC roles API
 * Run: node scripts/test-roles-api.js
 */

const API_BASE = 'http://localhost:4002/api/rbac/roles';

async function testAPI(endpoint, options = {}) {
  try {
    console.log(`\n🔍 Testing: ${options.method || 'GET'} ${endpoint}`);
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.text();
    let jsonData;
    
    try {
      jsonData = JSON.parse(data);
    } catch (e) {
      console.log(`📄 Response (${response.status}):`, data.substring(0, 200) + '...');
      return;
    }
    
    if (response.ok) {
      console.log(`✅ Success (${response.status}):`, JSON.stringify(jsonData, null, 2).substring(0, 300) + '...');
    } else {
      console.log(`❌ Error (${response.status}):`, jsonData);
    }
    
    return { response, data: jsonData };
    
  } catch (error) {
    console.log(`💥 Network Error:`, error.message);
  }
}

async function runTests() {
  console.log('🚀 Testing Enhanced RBAC Roles API\n');
  
  // Test 1: List all roles
  await testAPI('');
  
  // Test 2: Export CSV
  await testAPI('?format=csv');
  
  // Test 3: Export JSON
  await testAPI('?format=json');
  
  // Test 4: Create a test role
  const createResult = await testAPI('', {
    method: 'POST',
    body: JSON.stringify({
      name: 'test_role',
      level: 25,
      description: 'Test role for API validation',
      permissions: ['view_dashboard', 'view_reports'],
      pii_scope: 'masked',
      allowed_regions: ['NCR', 'CEBU'],
      domain: 'fraud'
    })
  });
  
  let testRoleId = null;
  if (createResult?.data?.id) {
    testRoleId = createResult.data.id;
    
    // Test 5: Get single role
    await testAPI(`/${testRoleId}`);
    
    // Test 6: Update role (should create pending change for sensitive roles)
    await testAPI(`/${testRoleId}`, {
      method: 'PUT',
      headers: {
        'x-change-reason': 'Testing update workflow'
      },
      body: JSON.stringify({
        description: 'Updated test role description',
        pii_scope: 'full'
      })
    });
    
    // Test 7: Get role users
    await testAPI(`/${testRoleId}/users`);
    
    // Test 8: Get role versions
    await testAPI(`/${testRoleId}/versions`);
    
    // Test 9: Delete test role
    await testAPI(`/${testRoleId}`, {
      method: 'DELETE'
    });
  }
  
  // Test 10: List pending changes
  await testAPI('/pending');
  
  // Test 11: Bulk import (empty array)
  await testAPI('/import', {
    method: 'POST',
    body: JSON.stringify([])
  });
  
  console.log('\n🎉 API Testing Complete!\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down test script...');
  process.exit(0);
});

runTests().catch(console.error);