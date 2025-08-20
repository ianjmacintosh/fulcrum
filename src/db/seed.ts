import { connectToDatabase } from './connection'
import { JobApplication, ApplicationStatus, Workflow, JobBoard } from './schemas'
import { adminService } from './services/admin'
import { userService } from './services/users'
import { applicationStatusService } from './services/application-statuses'
import { applicationService } from './services/applications'
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

export async function seedDatabase(forceReseed: boolean = false) {
  const db = await connectToDatabase()

  console.log('🌱 Checking database seed status...')

  try {
    // Always ensure admin exists
    await seedAdmin()

    // Always ensure default user exists and get their ID
    const aliceUserId = await seedUser()

    // Migrate any existing test user data to Alice
    await migrateTestUserDataToAlice(aliceUserId)

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
          { id: 'event_1', title: 'Application Submitted', description: 'Applied through LinkedIn', date: '2025-06-17' },
          { id: 'event_2', title: 'Phone Screen Completed', description: 'Phone screen completed', date: '2025-07-24' },
          { id: 'event_3', title: 'Technical Interview', description: 'Technical interview', date: '2025-07-29' }
        ],
        appliedDate: '2025-06-17',
        phoneScreenDate: '2025-07-24',
        round1Date: '2025-07-29',
        currentStatus: { id: 'round_1', name: 'Round 1', eventId: 'event_3' },
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
          { id: 'event_4', title: 'Application Submitted', description: 'Applied through LinkedIn', date: '2025-07-13' },
          { id: 'event_5', title: 'Phone Screen Completed', description: 'Phone screen with hiring manager', date: '2025-07-24' },
          { id: 'event_6', title: 'Technical Challenge', description: 'Technical coding challenge', date: '2025-08-06' },
          { id: 'event_7', title: 'Final Interview', description: 'Final round interview', date: '2025-08-13' }
        ],
        appliedDate: '2025-07-13',
        phoneScreenDate: '2025-07-24',
        round1Date: '2025-08-06',
        round2Date: '2025-08-13',
        currentStatus: { id: 'round_2', name: 'Round 2', eventId: 'event_7' },
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
          { id: 'event_8', title: 'Application Submitted', description: 'Referral from former colleague', date: '2025-05-28' },
          { id: 'event_9', title: 'Phone Screen Completed', description: 'Phone screen completed', date: '2025-06-10' },
          { id: 'event_10', title: 'Rejection Received', description: 'Position filled internally', date: '2025-06-20' }
        ],
        appliedDate: '2025-05-28',
        phoneScreenDate: '2025-06-10',
        declinedDate: '2025-06-20',
        currentStatus: { id: 'declined', name: 'Declined', eventId: 'event_10' },
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
          { id: 'event_11', title: 'Application Submitted', description: 'Applied through LinkedIn', date: '2025-07-31' },
          { id: 'event_12', title: 'Phone Screen Scheduled', description: 'Phone screen scheduled', date: '2025-08-14' }
        ],
        appliedDate: '2025-07-31',
        phoneScreenDate: '2025-08-14',
        currentStatus: { id: 'phone_screen', name: 'Phone Screen', eventId: 'event_12' },
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
          { id: 'event_13', title: 'Application Submitted', description: 'Applied through LinkedIn', date: '2025-08-01' }
        ],
        appliedDate: '2025-08-01',
        currentStatus: { id: 'applied', name: 'Applied', eventId: 'event_13' },
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

    if (totalExistingRecords > 0 && !forceReseed) {
      console.log(`✅ Database already contains ${totalExistingRecords} records:`)
      console.log(`   - Application statuses: ${existingStatuses}`)
      console.log(`   - Workflows: ${existingWorkflows}`)
      console.log(`   - Job boards: ${existingJobBoards}`)
      console.log(`   - Applications: ${existingApps}`)
      console.log('🔒 Skipping seed to preserve existing data')
      return
    }
    
    if (forceReseed && totalExistingRecords > 0) {
      console.log(`🔄 Force re-seeding with ${totalExistingRecords} existing records`)
    }

    console.log('📦 Database is empty, proceeding with seed...')

    // Create default statuses using the new 7-status workflow
    await applicationStatusService.createDefaultStatuses(aliceUserId)
    console.log('✅ Created default application statuses')

    // Insert default workflows  
    const workflowResult = await db.collection('workflows').insertMany(defaultWorkflows)
    console.log(`✅ Inserted ${workflowResult.insertedCount} workflows`)

    // Insert default job boards
    const jobBoardResult = await db.collection('job_boards').insertMany(defaultJobBoards)
    console.log(`✅ Inserted ${jobBoardResult.insertedCount} job boards`)

    // Insert sample applications with correct currentStatus calculation
    const applicationsWithCorrectStatus = sampleApplications.map(app => ({
      ...app,
      currentStatus: applicationService.calculateCurrentStatus(app)
    }))
    
    const appResult = await db.collection('applications').insertMany(applicationsWithCorrectStatus)
    console.log(`✅ Inserted ${appResult.insertedCount} sample applications with calculated status`)

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