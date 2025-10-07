import { JWTUtil } from './utils/jwt';

// Test JWT functionality
console.log('🧪 Testing JWT Utilities...');

const testPayload = {
  userId: 1,
  email: 'test@student.com',
  subscriptionType: 'free'
};

try {
  // Test token generation
  const token = JWTUtil.generateToken(testPayload);
  console.log('✅ JWT Token generated successfully');
  console.log('Token:', token.substring(0, 50) + '...');

  // Test token verification
  const decoded = JWTUtil.verifyToken(token);
  console.log('✅ JWT Token verified successfully');
  console.log('Decoded payload:', decoded);

  // Test token extraction
  const extracted = JWTUtil.extractToken(`Bearer ${token}`);
  console.log('✅ Token extraction working:', extracted === token);

  console.log('\n🎉 All JWT tests passed!');

} catch (error) {
  console.error('❌ JWT test failed:', error);
}