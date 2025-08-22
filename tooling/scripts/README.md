# BenPharm Scripts

This directory contains utility scripts for database management and setup.

## Available Scripts

### Create Admin User
Creates an admin user in the database with authentication credentials.

```bash
npm run create:user
```

**Required Environment Variables:**
- `ADMIN_EMAIL`: Admin user email address
- `ADMIN_PASSWORD`: Secure password for the admin user  
- `ADMIN_NAME`: Display name for admin (optional, defaults to "BenPharm Admin")

### Create Customer Profile
Creates customer profiles for existing users who don't have them.

```bash
npm run create:customer
```

This script will:
- List all existing users and customers
- Identify users without customer profiles
- Create a RETAIL customer profile for the first user found

## Security Notes

- Never commit hardcoded credentials to version control
- Always use environment variables for sensitive data
- Keep the `.env` file private and never commit it
- Use `.env.example` for documenting required variables

## Setup

1. Copy `.env.example` to `.env` in the project root
2. Fill in your actual credentials in the `.env` file
3. Run the desired script using npm commands
