# Fulcrum

## Summary 

Find your next job like a pro

Fulcrum is a tool to help job seekers keep track of all the moving pieces in their job search:
- Jobs they've applied for so they can track their "conversion rate" for different stages of their search, and know what kinds of jobs they're likely to convert
- Job boards that are yielding results vs not
- Resumes that are working (and whether spending time tweaking them is helpful)

## Pages

* Dashboard
* Job Boards
* Applications
* Resumes
* Settings

### Dashboard

High-level overview of their search, including metrics on:

- Number of jobs applied for
- Conversion rate for cold applies
- Conversion rate for phone screens
- When the user can expect to get a job, given what the system knows about their rate of applying for jobs, conversion rate on each step of the process, and how many rounds of interviews they'll probably have for a given job

Also the system may suggest where the user should focus next

### Job Boards

Links to Job Boards (and saved searches on them) to find roles to apply for.

Each Job Board includes metrics including how much time they've spent using them, how many roles they've found, and what their conversion rates look like

### Applications

See all applications, see how many are still open, how many got closed, how many are still awaiting a response. This is the user's main screen to update job status, record new job activity such as: applied, declined, response received to schedule phone screen, phone screen complete, etc

### Resumes

See the different resumes the user's uploaded, how much time they've spent on them, what tools they've used, and how well they're performing

### Settings

Typical user settings (like change email address, password, time zone, etc), and extended functionality

- Set up auto-complete info to help fill in forms using a separate browser extension
- See a custom email address where the user can forward emails related to their job search (instead of updating status manually)

## Setup Instructions

### Database Tools

If you'd like to make a database backup, you'll need MongoDB Database Tools.

As of **21 Aug 2025**, I could install on a dev container by running:

```
wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-debian12-x86_64-100.13.0.deb
sudo apt install ./mongodb-database-tools-debian12-x86_64-100.13.0.deb
```


Up-to-date instructions may be found here: https://www.mongodb.com/docs/database-tools/installation/installation-linux/

### Development

To run the app in dev mode:

```
npm run dev
```

### Production

To build the app:

```
npm run build
```

To start the server:

```
npm run start
```

Railway (the infrastructure platform that hosts Fulcrum) has the server start command defined as a "Custom Start Command" in the Settings. It may be better to couple this with the build command, but for now it is a separate command.