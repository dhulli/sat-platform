// Using built-in fetch API (Node.js 18+)

const BASE_URL = 'http://localhost:5000/api/auth';

async function testJWT() {
  console.log('🧪 Testing JWT Authentication...\n');

  // Test 1: Register a user
  console.log('1. Testing User Registration...');
  try {
    const registerResponse = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jwt-test@student.com',
        password: 'password123',
        firstName: 'JWT',
        lastName: 'Test'
      })
    });
    const registerData = await registerResponse.json();
    console.log('✅ Registration:', registerData.message);
    
    if (registerData.data?.token) {
      const token = registerData.data.token;
      console.log('✅ JWT Token received:', token.substring(0, 50) + '...');
      
      // Test 2: Access protected route with valid token
      console.log('\n2. Testing Protected Route with Valid Token...');
      const profileResponse = await fetch(`${BASE_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const profileData = await profileResponse.json();
      console.log('✅ Protected route access:', profileData.success ? 'SUCCESS' : 'FAILED');
      
      // Test 3: Access protected route without token
      console.log('\n3. Testing Protected Route without Token...');
      const noTokenResponse = await fetch(`${BASE_URL}/profile`);
      const noTokenData = await noTokenResponse.json();
      console.log('✅ No token protection:', noTokenData.success === false ? 'BLOCKED (Good!)' : 'ALLOWED (Bad!)');
      
      // Test 4: Access with invalid token
      console.log('\n4. Testing Protected Route with Invalid Token...');
      const invalidTokenResponse = await fetch(`${BASE_URL}/profile`, {
        headers: {
          'Authorization': 'Bearer invalid-token-here'
        }
      });
      const invalidTokenData = await invalidTokenResponse.json();
      console.log('✅ Invalid token protection:', invalidTokenData.success === false ? 'BLOCKED (Good!)' : 'ALLOWED (Bad!)');
      
    } else {
      console.log('❌ No token received in registration');
    }
    
  } catch (error) {
    console.log('❌ JWT Test failed:', error);
  }
}

testJWT();