import { connectToDatabase } from './connection'
import { JobApplication, ApplicationStatus, Workflow, JobBoard } from './schemas'
import { adminService } from './services/admin'
import { hashPassword } from '../utils/crypto'

// Hard-coded test user ID for development
const TEST_USER_ID = 'test-user-123'

// Default application statuses
const defaultStatuses: Omit<ApplicationStatus, '_id'>[] = [
  { userId: TEST_USER_ID, name: 'Cold Apply', isTerminal: false, createdAt: new Date() },
  { userId: TEST_USER_ID, name: 'Warm Apply', isTerminal: false, createdAt: new Date() },
  { userId: TEST_USER_ID, name: 'Phone Screen', isTerminal: false, createdAt: new Date() },
  { userId: TEST_USER_ID, name: 'Round 2', isTerminal: false, createdAt: new Date() },
  { userId: TEST_USER_ID, name: 'Round 3', isTerminal: false, createdAt: new Date() },
  { userId: TEST_USER_ID, name: 'Offer', isTerminal: true, createdAt: new Date() },
  { userId: TEST_USER_ID, name: 'Declined', isTerminal: true, createdAt: new Date() }
]

// Default workflows
const defaultWorkflows: Omit<Workflow, '_id'>[] = [
  {
    userId: TEST_USER_ID,
    name: 'Cold Apply Process',
    description: 'Standard cold application workflow',
    isDefault: true,
    steps: [
      { statusId: 'cold_apply', isOptional: false },
      { statusId: 'phone_screen', isOptional: false },
      { statusId: 'round_2', isOptional: false },
      { statusId: 'round_3', isOptional: false },
      { statusId: 'offer', isOptional: false }
    ],
    createdAt: new Date()
  },
  {
    userId: TEST_USER_ID,
    name: 'Warm Apply Process',
    description: 'Referral/warm application workflow',
    isDefault: true,
    steps: [
      { statusId: 'warm_apply', isOptional: false },
      { statusId: 'phone_screen', isOptional: false },
      { statusId: 'round_2', isOptional: false },
      { statusId: 'round_3', isOptional: false },
      { statusId: 'offer', isOptional: false }
    ],
    createdAt: new Date()
  }
]

// Default job boards
const defaultJobBoards: Omit<JobBoard, '_id'>[] = [
  { userId: TEST_USER_ID, name: 'LinkedIn', url: 'https://linkedin.com', createdAt: new Date() },
  { userId: TEST_USER_ID, name: 'Indeed', url: 'https://indeed.com', createdAt: new Date() },
  { userId: TEST_USER_ID, name: 'Glassdoor', url: 'https://glassdoor.com', createdAt: new Date() },
  { userId: TEST_USER_ID, name: 'Otta', url: 'https://otta.com', createdAt: new Date() },
  { userId: TEST_USER_ID, name: 'Company Site', url: '', createdAt: new Date() }
]

// Sample applications based on your real data
const sampleApplications: Omit<JobApplication, '_id'>[] = [
  {
    userId: TEST_USER_ID,
    companyName: 'TechCorp Alpha',
    roleName: 'Senior Frontend Manager',
    jobPostingUrl: '',
    jobBoard: { id: 'linkedin', name: 'LinkedIn' },
    workflow: { id: 'cold_apply', name: 'Cold Apply Process' },
    applicationType: 'cold',
    roleType: 'manager',
    locationType: 'on-site',
    events: [
      { statusId: 'cold_apply', statusName: 'Cold Apply', date: '2025-06-17', notes: 'Applied through LinkedIn' },
      { statusId: 'phone_screen', statusName: 'Phone Screen', date: '2025-07-24', notes: 'Phone screen completed' },
      { statusId: 'round_2', statusName: 'Round 2', date: '2025-07-29', notes: 'Technical interview' }
    ],
    currentStatus: { id: 'round_2', name: 'Round 2' },
    createdAt: new Date('2025-06-17'),
    updatedAt: new Date('2025-07-29')
  },
  {
    userId: TEST_USER_ID,
    companyName: 'StartupBeta',
    roleName: 'Frontend Engineer - Platform',
    jobPostingUrl: '',
    jobBoard: { id: 'linkedin', name: 'LinkedIn' },
    workflow: { id: 'cold_apply', name: 'Cold Apply Process' },
    applicationType: 'cold',
    roleType: 'engineer',
    locationType: 'remote',
    events: [
      { statusId: 'cold_apply', statusName: 'Cold Apply', date: '2025-07-13', notes: 'Applied through LinkedIn' },
      { statusId: 'phone_screen', statusName: 'Phone Screen', date: '2025-07-24', notes: 'Phone screen with hiring manager' },
      { statusId: 'round_2', statusName: 'Round 2', date: '2025-08-06', notes: 'Technical coding challenge' },
      { statusId: 'round_3', statusName: 'Round 3', date: '2025-08-13', notes: 'Final round interview' }
    ],
    currentStatus: { id: 'round_3', name: 'Round 3' },
    createdAt: new Date('2025-07-13'),
    updatedAt: new Date('2025-08-13')
  },
  {
    userId: TEST_USER_ID,
    companyName: 'ScaleTech',
    roleName: 'Engineering Manager - Web',
    jobPostingUrl: '',
    jobBoard: { id: 'linkedin', name: 'LinkedIn' },
    workflow: { id: 'warm_apply', name: 'Warm Apply Process' },
    applicationType: 'warm',
    roleType: 'manager',
    locationType: 'on-site',
    events: [
      { statusId: 'warm_apply', statusName: 'Warm Apply', date: '2025-05-28', notes: 'Referral from former colleague' },
      { statusId: 'phone_screen', statusName: 'Phone Screen', date: '2025-06-10', notes: 'Phone screen completed' },
      { statusId: 'declined', statusName: 'Declined', date: '2025-06-20', notes: 'Position filled internally' }
    ],
    currentStatus: { id: 'declined', name: 'Declined' },
    createdAt: new Date('2025-05-28'),
    updatedAt: new Date('2025-06-20')
  },
  {
    userId: TEST_USER_ID,
    companyName: 'GrowthCo',
    roleName: 'Engineering Manager - Growth',
    jobPostingUrl: '',
    jobBoard: { id: 'linkedin', name: 'LinkedIn' },
    workflow: { id: 'cold_apply', name: 'Cold Apply Process' },
    applicationType: 'cold',
    roleType: 'manager',
    locationType: 'on-site',
    events: [
      { statusId: 'cold_apply', statusName: 'Cold Apply', date: '2025-07-31', notes: 'Applied through LinkedIn' },
      { statusId: 'phone_screen', statusName: 'Phone Screen', date: '2025-08-14', notes: 'Phone screen scheduled' }
    ],
    currentStatus: { id: 'phone_screen', name: 'Phone Screen' },
    createdAt: new Date('2025-07-31'),
    updatedAt: new Date('2025-08-14')
  },
  {
    userId: TEST_USER_ID,
    companyName: 'InnovateLabs',
    roleName: 'Principal Software Engineer',
    jobPostingUrl: '',
    jobBoard: { id: 'linkedin', name: 'LinkedIn' },
    workflow: { id: 'cold_apply', name: 'Cold Apply Process' },
    applicationType: 'cold',
    roleType: 'engineer',
    locationType: 'hybrid',
    events: [
      { statusId: 'cold_apply', statusName: 'Cold Apply', date: '2025-08-01', notes: 'Applied through LinkedIn' }
    ],
    currentStatus: { id: 'cold_apply', name: 'Cold Apply' },
    createdAt: new Date('2025-08-01'),
    updatedAt: new Date('2025-08-01')
  }
]

async function seedAdmin() {
  console.log('🔐 Setting up admin user...')
  
  const defaultUsername = 'admin'
  
  // Check if admin already exists
  const existingAdmin = await adminService.getAdminByUsername(defaultUsername)
  if (existingAdmin) {
    console.log('✅ Admin user already exists')
    return
  }
  
  // Generate a secure random password for first-time setup
  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(x => chars[x % chars.length])
      .join('')
  }
  
  const tempPassword = generateSecurePassword()
  
  // Hash the temporary password
  const hashedPassword = await hashPassword(tempPassword)
  
  // Create admin user
  await adminService.createAdminUser(defaultUsername, hashedPassword)
  
  console.log('✅ Default admin user created')
  console.log('')
  console.log('🔐 IMPORTANT: Save this temporary password (will not be shown again):')
  console.log('   Username:', defaultUsername)
  console.log('   Password:', tempPassword)
  console.log('')
  console.log('⚠️  Please change this password immediately after first login!')
}

export async function seedDatabase() {
  const db = await connectToDatabase()

  console.log('🌱 Checking database seed status...')

  try {
    // Always ensure admin exists
    await seedAdmin()
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