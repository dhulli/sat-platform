import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

console.log('🔍 Checking environment variables...');
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
console.log('DB_HOST exists:', !!process.env.DB_HOST);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Now import and test JWT
import { JWTUtil } from './utils/jwt';

console.log('\n🧪 Testing JWT functionality...');

const testPayload = {
  userId: 1,
  email: 'test@student.com',
  subscriptionType: 'free'
};

try {
  // Test token generation
  const token = JWTUtil.generateToken(testPayload);
  console.log('✅ JWT Token generated successfully');
  console.log('Token length:', token.length);
  console.log('Token preview:', token.substring(0, 50) + '...');

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