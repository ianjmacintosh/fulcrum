# Database Re-seeding Strategy

Since you don't have valuable application data in any environment (only user credentials to preserve), **re-seeding is the safest and simplest approach** for updating to the new event recording architecture.

## Why Re-seeding Instead of Migration?

✅ **Simpler and safer** than complex data migration  
✅ **Guaranteed consistency** with new schema format  
✅ **Preserves user credentials** (admin and user accounts)  
✅ **Fresh, clean data** with proper new architecture  
✅ **No risk of data corruption** from migration issues  

## What Gets Preserved vs. Cleared

### ✅ **Preserved (Important Data)**
- **User accounts** (`users` collection)
- **Admin accounts** (`admins` collection)  
- **Login credentials and passwords**

### 🧹 **Cleared (Application Data)**
- **Job applications** (`applications` collection)
- **Application statuses** (`application_statuses` collection)
- **Workflows** (`workflows` collection) 
- **Job boards** (`job_boards` collection)
- **Migration history** (`_migrations` collection)

## Re-seeding Commands

### **Development Environment**
```bash
# Local development database
npm run db:reseed local
```

### **Production Environments**
```bash
# For Railway environments
railway run --environment <env> npm run db:reseed local

# Examples:
railway run --environment staging npm run db:reseed local
railway run --environment production npm run db:reseed local
```

### **Available Commands**
```bash
npm run db:reseed                    # Show help and usage
npm run db:reseed local             # Re-seed local development
npm run db:reseed env <environment> # Re-seed specific environment  
npm run db:reseed force             # Force re-seed (dangerous)
```

## New Seeded Data

After re-seeding, you'll have:

### **User Accounts**
- **Admin**: `admin` / `[password from ADMIN_PASSWORD env var]`
- **Default User**: `alice@wonderland.dev` / `followthewhiterabbit`

### **Application Statuses** (New 7-Status Workflow)
1. **Not Applied** - Application not yet submitted
2. **Applied** - Application has been submitted  
3. **Phone Screen** - Initial phone screening interview
4. **Round 1** - First interview round
5. **Round 2** - Second interview round  
6. **Accepted** - Job offer accepted
7. **Declined** - Application declined/rejected

### **Sample Applications** (5 Examples)
All with **new schema format**:
- Events use `{title, description, date}` format
- Status dates: `appliedDate`, `phoneScreenDate`, `round1Date`, `round2Date`, `acceptedDate`, `declinedDate`
- Realistic timeline progression showing different application states

### **Job Boards**
- LinkedIn, Indeed, Glassdoor, Otta, Company Site

## Environment Rollout Strategy

### **1. Development Environment (First)**
```bash
# Test locally first
npm run db:reseed local

# Verify application works
npm run dev
# Navigate to http://localhost:3000/login
# Login as Alice to see new seeded data
```

### **2. Staging Environment (Second)**  
```bash
# Re-seed staging
railway run --environment staging npm run db:reseed local

# Deploy new application code
railway deploy --environment staging

# Test functionality
railway open --environment staging
```

### **3. Production Environment (Last)**
```bash
# Schedule maintenance window
# Create backup (if desired)
railway run --environment production mongodump --uri $MONGO_URL

# Re-seed production database
railway run --environment production npm run db:reseed local

# Deploy new application code  
railway deploy --environment production

# Verify functionality
railway open --environment production
```

## Safety and Validation

### **Pre-Re-seed Checklist**
- [ ] Confirmed no valuable application data exists
- [ ] User credentials documented/backed up if needed
- [ ] New application code is ready to deploy
- [ ] Team is aware of the maintenance window

### **Post-Re-seed Validation**
```bash
# Check data was seeded correctly
railway run npm run db:migrate validate

# Manual testing checklist:
# - [ ] Can log in as admin and Alice
# - [ ] Applications page shows sample data (when logged in)
# - [ ] Event recording form works
# - [ ] Status progression date pickers work
# - [ ] Events timeline displays correctly
```

### **If Something Goes Wrong**
1. **Quick Recovery**: Re-run the re-seed command
2. **Code Issues**: Deploy previous application version
3. **Data Issues**: Check logs and run validation
4. **User Login Issues**: Verify user accounts in database

## Sample Data Overview

The re-seeded database includes realistic sample applications:

1. **TechCorp Alpha** - Manager role, progressed to Round 1
2. **StartupBeta** - Engineer role, progressed to Round 2  
3. **ScaleTech** - Manager role, declined/rejected
4. **GrowthCo** - Manager role, currently at Phone Screen
5. **InnovateLabs** - Engineer role, recently applied

Each application demonstrates:
- ✅ **New event format** (`title`, `description`, `date`)
- ✅ **Status date tracking** (`appliedDate`, `phoneScreenDate`, etc.)
- ✅ **Realistic timelines** showing progression through workflow
- ✅ **Different outcomes** (in progress, declined, various stages)

## Timeline

**Estimated time per environment:**
- **Backup**: 2-5 minutes (if needed)
- **Re-seed**: 30 seconds
- **Deploy**: 2-5 minutes  
- **Validation**: 5-10 minutes
- **Total**: 10-20 minutes per environment

## Ready to Re-seed?

Start with development:
```bash
npm run db:reseed local
```

This approach is **much simpler and safer** than data migration when you don't have critical data to preserve!