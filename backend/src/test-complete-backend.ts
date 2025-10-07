import dotenv from 'dotenv';
import { config } from 'dotenv';

// Load environment variables
config();

console.log('🚀 Testing Complete Backend Setup');
console.log('================================');

// Check critical environment variables
const requiredEnvVars = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME'];
let allEnvVarsPresent = true;

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.log(`❌ ${envVar}: MISSING`);
    allEnvVarsPresent = false;
  } else {
    console.log(`✅ ${envVar}: PRESENT`);
  }
});

if (!allEnvVarsPresent) {
  console.log('\n💡 Please check your .env file');
  process.exit(1);
}

console.log('\n🧪 Testing database connection...');
import pool from './config/database';

async function testDatabase() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connection successful');
    
    const [result] = await connection.execute('SELECT 1 + 1 AS test');
    console.log('✅ Database query test:', (result as any)[0].test);
    
    connection.release();
    
    // Test JWT
    console.log('\n🧪 Testing JWT...');
    const { JWTUtil } = await import('./utils/jwt');
    
    const testPayload = { userId: 1, email: 'test@test.com', subscriptionType: 'free' };
    const token = JWTUtil.generateToken(testPayload);
    console.log('✅ JWT generation successful');
    
    const decoded = JWTUtil.verifyToken(token);
    console.log('✅ JWT verification successful');
    
    console.log('\n🎉 BACKEND SETUP COMPLETE!');
    console.log('You can now start the server with: npm run dev');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDatabase();