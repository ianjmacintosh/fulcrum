const checkUsers = async () => {
  const { connectToDatabase, closeDatabaseConnection } = await import('./src/db/connection.js')

  try {
    console.log('🔍 Checking User Accounts')
    console.log('='.repeat(40))
    
    const db = await connectToDatabase()
    
    // Check regular users
    const usersCollection = db.collection('users')
    const users = await usersCollection.find({}).toArray()
    console.log(`👥 Regular Users: ${users.length}`)
    users.forEach(user => {
      console.log(`   - Email: ${user.email}, Name: ${user.name}`)
    })
    
    // Check admin users
    const adminCollection = db.collection('admin_users') 
    const admins = await adminCollection.find({}).toArray()
    console.log(`\n🔐 Admin Users: ${admins.length}`)
    admins.forEach(admin => {
      console.log(`   - Username: ${admin.username}`)
    })
    
    // Check environment variables being used
    console.log('\n🌍 Environment Variables:')
    console.log(`   USER_EMAIL: ${process.env.USER_EMAIL}`)
    console.log(`   USER_PASSWORD: [${process.env.USER_PASSWORD ? 'SET' : 'NOT SET'}]`)
    console.log(`   ADMIN_EMAIL: ${process.env.ADMIN_EMAIL}`) 
    console.log(`   ADMIN_PASSWORD: [${process.env.ADMIN_PASSWORD ? 'SET' : 'NOT SET'}]`)
    
  } catch (error) {
    console.error('💥 Error:', error)
  } finally {
    await closeDatabaseConnection()
  }
}

checkUsers()