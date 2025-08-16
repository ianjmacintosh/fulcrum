import { connectToDatabase } from './connection'
import { JobApplication, ApplicationStatus, Workflow, JobBoard } from './schemas'
import { adminService } from './services/admin'
import { userService } from './services/users'
import { hashPassword } from '../utils/crypto'

async function seedAdmin() {
  console.log('🔐 Setting up admin user...')

  const defaultUsername = 'admin'

  // Check if admin already exists
  const existingAdmin = await adminService.getAdminByUsername(defaultUsername)
  if (existingAdmin) {
    console.log('✅ Admin user already exists')
    return
  }

  // Use environment variable "ADMIN_PASSWORD" if set, otherwise generate a random password
  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(x => chars[x % chars.length])
      .join('')
  }

  const tempPassword = process.env.ADMIN_PASSWORD || generateSecurePassword()

  // Hash the temporary password
  const hashedPassword = await hashPassword(tempPassword)

  // Create admin user
  await adminService.createAdminUser(defaultUsername, hashedPassword)

  console.log('✅ Default admin user created')
  console.log('')
  if (process.env.ADMIN_PASSWORD) {
    console.log('🔐 Admin password set from environment variable: ADMIN_PASSWORD')
    console.log('   Username:', defaultUsername)
  } else {
    console.log('🔐 IMPORTANT: Save this temporary password (will not be shown again):')
    console.log('   Username:', defaultUsername)
    console.log('   Password:', tempPassword)
    console.log('')
    console.log('⚠️  Please change this password immediately after first login!')
  }
}

async function seedUser() {
  console.log('👤 Setting up default user...')

  const defaultEmail = 'alice@wonderland.dev'
  const defaultName = 'Alice'
  const defaultPassword = 'followthewhiterabbit'

  // Check if user already exists
  let existingUser = await userService.getUserByEmail(defaultEmail)
  if (existingUser) {
    console.log('✅ Default user Alice already exists')
    return existingUser.id
  }

  // Hash the password
  const hashedPassword = await hashPassword(defaultPassword)

  // Create user
  const user = await userService.createUser({
    email: defaultEmail,
    name: defaultName,
    hashedPassword
  })

  console.log('✅ Default user Alice created')
  console.log(`   Email: ${defaultEmail}`)
  console.log(`   Password: ${defaultPassword}`)

  return user.id
}

async function migrateTestUserDataToAlice(aliceUserId: string) {
  console.log('🔄 Migrating existing test user data to Alice...')

  const db = await connectToDatabase()
  const testUserId = 'test-user-123'

  // Update application statuses
  const statusResult = await db.collection('application_statuses').updateMany(
    { userId: testUserId },
    { $set: { userId: aliceUserId } }
  )

  // Update workflows
  const workflowResult = await db.collection('workflows').updateMany(
    { userId: testUserId },
    { $set: { userId: aliceUserId } }
  )

  // Update job boards
  const jobBoardResult = await db.collection('job_boards').updateMany(
    { userId: testUserId },
    { $set: { userId: aliceUserId } }
  )

  // Update applications
  const appResult = await db.collection('applications').updateMany(
    { userId: testUserId },
    { $set: { userId: aliceUserId } }
  )

  const totalMigrated = statusResult.modifiedCount + workflowResult.modifiedCount +
    jobBoardResult.modifiedCount + appResult.modifiedCount

  if (totalMigrated > 0) {
    console.log(`✅ Migrated ${totalMigrated} records from test user to Alice:`)
    console.log(`   - Application statuses: ${statusResult.modifiedCount}`)
    console.log(`   - Workflows: ${workflowResult.modifiedCount}`)
    console.log(`   - Job boards: ${jobBoardResult.modifiedCount}`)
    console.log(`   - Applications: ${appResult.modifiedCount}`)
  } else {
    console.log('✅ No test user data found to migrate')
  }
}

export async function seedDatabase() {
  const db = await connectToDatabase()

  console.log('🌱 Checking database seed status...')

  try {
    // Always ensure admin exists
    await seedAdmin()

    // Always ensure default user exists and get their ID
    const aliceUserId = await seedUser()

    // Migrate any existing test user data to Alice
    await migrateTestUserDataToAlice(aliceUserId)

    // Define sample data using Alice's real user ID
    const defaultStatuses: Omit<ApplicationStatus, '_id'>[] = [
      { userId: aliceUserId, name: 'Applied', isTerminal: false, createdAt: new Date() },
      { userId: aliceUserId, name: 'Phone Screen', isTerminal: false, createdAt: new Date() },
      { userId: aliceUserId, name: 'Round 1', isTerminal: false, createdAt: new Date() },
      { userId: aliceUserId, name: 'Round 2', isTerminal: false, createdAt: new Date() },
      { userId: aliceUserId, name: 'Offer Letter Received', isTerminal: false, createdAt: new Date() },
      { userId: aliceUserId, name: 'Accepted', isTerminal: true, createdAt: new Date() },
      { userId: aliceUserId, name: 'Declined', isTerminal: true, createdAt: new Date() }
    ]

    const defaultWorkflows: Omit<Workflow, '_id'>[] = [
      {
        userId: aliceUserId,
        name: 'Basic Workflow',
        description: 'Standard job application workflow',
        isDefault: true,
        steps: [
          { statusId: 'applied', isOptional: false },
          { statusId: 'phone_screen', isOptional: false },
          { statusId: 'round_1', isOptional: false },
          { statusId: 'round_2', isOptional: false },
          { statusId: 'offer_letter_received', isOptional: false },
          { statusId: 'accepted', isOptional: false },
          { statusId: 'declined', isOptional: true }
        ],
        createdAt: new Date()
      }
    ]

    const defaultJobBoards: Omit<JobBoard, '_id'>[] = [
      { userId: aliceUserId, name: 'LinkedIn', url: 'https://linkedin.com', createdAt: new Date() },
      { userId: aliceUserId, name: 'Indeed', url: 'https://indeed.com', createdAt: new Date() },
      { userId: aliceUserId, name: 'Glassdoor', url: 'https://glassdoor.com', createdAt: new Date() },
      { userId: aliceUserId, name: 'Otta', url: 'https://otta.com', createdAt: new Date() },
      { userId: aliceUserId, name: 'Company Site', url: '', createdAt: new Date() }
    ]

    const sampleApplications: Omit<JobApplication, '_id'>[] = [
      {
        userId: aliceUserId,
        companyName: 'TechCorp Alpha',
        roleName: 'Senior Frontend Manager',
        jobPostingUrl: '',
        jobBoard: { id: 'linkedin', name: 'LinkedIn' },
        workflow: { id: 'basic_workflow', name: 'Basic Workflow' },
        applicationType: 'cold',
        roleType: 'manager',
        locationType: 'on-site',
        events: [
          { statusId: 'applied', statusName: 'Applied', date: '2025-06-17', notes: 'Applied through LinkedIn' },
          { statusId: 'phone_screen', statusName: 'Phone Screen', date: '2025-07-24', notes: 'Phone screen completed' },
          { statusId: 'round_2', statusName: 'Round 2', date: '2025-07-29', notes: 'Technical interview' }
        ],
        currentStatus: { id: 'round_2', name: 'Round 2' },
        createdAt: new Date('2025-06-17'),
        updatedAt: new Date('2025-07-29')
      },
      {
        userId: aliceUserId,
        companyName: 'StartupBeta',
        roleName: 'Frontend Engineer - Platform',
        jobPostingUrl: '',
        jobBoard: { id: 'linkedin', name: 'LinkedIn' },
        workflow: { id: 'basic_workflow', name: 'Basic Workflow' },
        applicationType: 'cold',
        roleType: 'engineer',
        locationType: 'remote',
        events: [
          { statusId: 'applied', statusName: 'Applied', date: '2025-07-13', notes: 'Applied through LinkedIn' },
          { statusId: 'phone_screen', statusName: 'Phone Screen', date: '2025-07-24', notes: 'Phone screen with hiring manager' },
          { statusId: 'round_1', statusName: 'Round 1', date: '2025-08-06', notes: 'Technical coding challenge' },
          { statusId: 'round_2', statusName: 'Round 2', date: '2025-08-13', notes: 'Final round interview' }
        ],
        currentStatus: { id: 'round_2', name: 'Round 2' },
        createdAt: new Date('2025-07-13'),
        updatedAt: new Date('2025-08-13')
      },
      {
        userId: aliceUserId,
        companyName: 'ScaleTech',
        roleName: 'Engineering Manager - Web',
        jobPostingUrl: '',
        jobBoard: { id: 'linkedin', name: 'LinkedIn' },
        workflow: { id: 'basic_workflow', name: 'Basic Workflow' },
        applicationType: 'warm',
        roleType: 'manager',
        locationType: 'on-site',
        events: [
          { statusId: 'applied', statusName: 'Applied', date: '2025-05-28', notes: 'Referral from former colleague' },
          { statusId: 'phone_screen', statusName: 'Phone Screen', date: '2025-06-10', notes: 'Phone screen completed' },
          { statusId: 'declined', statusName: 'Declined', date: '2025-06-20', notes: 'Position filled internally' }
        ],
        currentStatus: { id: 'declined', name: 'Declined' },
        createdAt: new Date('2025-05-28'),
        updatedAt: new Date('2025-06-20')
      },
      {
        userId: aliceUserId,
        companyName: 'GrowthCo',
        roleName: 'Engineering Manager - Growth',
        jobPostingUrl: '',
        jobBoard: { id: 'linkedin', name: 'LinkedIn' },
        workflow: { id: 'basic_workflow', name: 'Basic Workflow' },
        applicationType: 'cold',
        roleType: 'manager',
        locationType: 'on-site',
        events: [
          { statusId: 'applied', statusName: 'Applied', date: '2025-07-31', notes: 'Applied through LinkedIn' },
          { statusId: 'phone_screen', statusName: 'Phone Screen', date: '2025-08-14', notes: 'Phone screen scheduled' }
        ],
        currentStatus: { id: 'phone_screen', name: 'Phone Screen' },
        createdAt: new Date('2025-07-31'),
        updatedAt: new Date('2025-08-14')
      },
      {
        userId: aliceUserId,
        companyName: 'InnovateLabs',
        roleName: 'Principal Software Engineer',
        jobPostingUrl: '',
        jobBoard: { id: 'linkedin', name: 'LinkedIn' },
        workflow: { id: 'basic_workflow', name: 'Basic Workflow' },
        applicationType: 'cold',
        roleType: 'engineer',
        locationType: 'hybrid',
        events: [
          { statusId: 'applied', statusName: 'Applied', date: '2025-08-01', notes: 'Applied through LinkedIn' }
        ],
        currentStatus: { id: 'applied', name: 'Applied' },
        createdAt: new Date('2025-08-01'),
        updatedAt: new Date('2025-08-01')
      }
    ]

    // Check if data already exists
    const existingStatuses = await db.collection('application_statuses').countDocuments()
    const existingWorkflows = await db.collection('workflows').countDocuments()
    const existingJobBoards = await db.collection('job_boards').countDocuments()
    const existingApps = await db.collection('applications').countDocuments()

    const totalExistingRecords = existingStatuses + existingWorkflows + existingJobBoards + existingApps

    if (totalExistingRecords > 0) {
      console.log(`✅ Database already contains ${totalExistingRecords} records:`)
      console.log(`   - Application statuses: ${existingStatuses}`)
      console.log(`   - Workflows: ${existingWorkflows}`)
      console.log(`   - Job boards: ${existingJobBoards}`)
      console.log(`   - Applications: ${existingApps}`)
      console.log('🔒 Skipping seed to preserve existing data')
      return
    }

    console.log('📦 Database is empty, proceeding with seed...')

    // Insert default statuses
    const statusResult = await db.collection('application_statuses').insertMany(defaultStatuses)
    console.log(`✅ Inserted ${statusResult.insertedCount} application statuses`)

    // Insert default workflows  
    const workflowResult = await db.collection('workflows').insertMany(defaultWorkflows)
    console.log(`✅ Inserted ${workflowResult.insertedCount} workflows`)

    // Insert default job boards
    const jobBoardResult = await db.collection('job_boards').insertMany(defaultJobBoards)
    console.log(`✅ Inserted ${jobBoardResult.insertedCount} job boards`)

    // Insert sample applications
    const appResult = await db.collection('applications').insertMany(sampleApplications)
    console.log(`✅ Inserted ${appResult.insertedCount} sample applications`)

    console.log('🎉 Database seeded successfully!')

  } catch (error) {
    console.error('❌ Seeding error:', error)
    throw error
  }
}

// Run seed
seedDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })