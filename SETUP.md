# Setup Guide

## Prerequisites Installation

Since Node.js is not installed on your system, you'll need to install it first. Here are the options:

### Option 1: Install Node.js directly (Recommended)

1. **Download Node.js**: Go to [nodejs.org](https://nodejs.org) and download the LTS version for macOS
2. **Install**: Run the downloaded `.pkg` file and follow the installation wizard
3. **Verify**: Open a new terminal and run:
   ```bash
   node --version
   npm --version
   ```

### Option 2: Use Node Version Manager (nvm)

If you prefer using nvm:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart your terminal or run:
source ~/.zshrc

# Install Node.js
nvm install --lts
nvm use --lts
```

### Option 3: Use Homebrew (if you have admin access)

```bash
# Install Homebrew (requires admin privileges)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node
```

## After Installing Node.js

Once Node.js is installed, you can proceed with the application setup:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Supabase**:
   - Create a project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Create `.env.local` file:
     ```bash
     cp env.example .env.local
     ```
   - Edit `.env.local` with your Supabase credentials

3. **Set up the database**:
   - Go to your Supabase project SQL editor
   - Copy and paste the contents of `database-setup.sql`
   - Run the SQL commands

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser** and go to [http://localhost:3000](http://localhost:3000)

## Troubleshooting

### If you get permission errors:
- Make sure you have admin privileges on your Mac
- Try installing Node.js using the official installer from nodejs.org

### If npm install fails:
- Make sure you're in the project directory
- Try clearing npm cache: `npm cache clean --force`
- Try using yarn instead: `yarn install`

### If the app doesn't connect to Supabase:
- Check that your environment variables are correct
- Make sure your Supabase project is active
- Verify the database table was created successfully 