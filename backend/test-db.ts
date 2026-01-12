import prisma from './src/config/database';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Database connection successful!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Database connection failed:');
    console.error(error);
    process.exit(1);
  }
}

testConnection();
