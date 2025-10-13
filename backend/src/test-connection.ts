import pool from './config/database';

async function testDatabaseConnection() {
  let connection;
  try {
    console.log('🔍 Testing database connection...');
    
    // Test connection
    connection = await pool.getConnection();
    console.log('✅ Database connection successful!');
    
    // Test query
    const [rows] = await connection.execute('SELECT 1 + 1 AS result');
    console.log('✅ Basic query test1:', rows);

    // Test exam query
    const [exams] = await connection.execute('SELECT * from exams');
    console.log('✅ Basic query test2:', exams);

    // Test session query
    const [users] = await connection.execute('SELECT * from test_sessions');
    console.log('✅ Basic query test2:', users);
    
    // Check if database exists
    const [dbResult] = await connection.execute(
      'SELECT DATABASE() as current_db, USER() as `current_user`'
    );
    console.log('✅ Database info:', dbResult);
    
    // List all tables
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE table_schema = 'sat_platform'
    `);
    
    console.log('📊 Existing tables:');
    (tables as any[]).forEach(table => {
      console.log(`   - ${table.TABLE_NAME}`);
    });
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error details:', error);
    
    // Provide specific troubleshooting based on error
    const err = error as any;
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Solution: Check DB_USER and DB_PASSWORD in .env file');
    } else if (err.code === 'ENOTFOUND') {
      console.log('💡 Solution: Check DB_HOST in .env file - might be wrong RDS endpoint');
    } else if (err.code === 'ECONNREFUSED') {
      console.log('💡 Solution: Check DB_PORT or database might not be running');
    }
    
  } finally {
    if (connection) {
      connection.release();
    }
    process.exit();
  }
}

testDatabaseConnection();