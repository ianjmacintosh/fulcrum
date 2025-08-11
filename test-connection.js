import dotenv from 'dotenv'
import { connectToDatabase, closeDatabaseConnection } from './src/db/connection.ts'

// Load environment variables from .env file
dotenv.config()

async function testConnection() {
  console.log('🔗 Testing MongoDB connection...')
  console.log('Connection string:', process.env.MONGODB_URI ? '✅ Found' : '❌ Missing')
  
  if (process.env.MONGODB_URI) {
    // Show partial connection string for debugging (hide password)
    const uri = process.env.MONGODB_URI
    const safeUri = uri.replace(/:([^:@]+)@/, ':***@')
    console.log('Using URI:', safeUri)
  }
  
  try {
    const db = await connectToDatabase()
    console.log('✅ Successfully connected to MongoDB!')
    
    // Test a simple operation
    const collections = await db.listCollections().toArray()
    console.log(`📁 Found ${collections.length} collections`)
    
    await closeDatabaseConnection()
    console.log('✅ Connection test completed!')
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    console.log('\n💡 Make sure:')
    console.log('1. MONGODB_URI is set in your .env file')
    console.log('2. Railway MongoDB service is running')
    console.log('3. Connection string is correct')
    process.exit(1)
  }
}

testConnection()