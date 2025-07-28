# Deployment Guide

## Current Issue
The deployment failed because the system is trying to use `npm run dev` (development mode) instead of production commands.

## Solution Overview
Your application is already properly configured for production! The build process works correctly and creates optimized production files. You just need to update the deployment configuration.

## Step-by-Step Fix

### 1. Update .replit File (Manual Action Required)
Since the agent cannot modify the `.replit` file directly, you need to manually update it with TWO changes:

**Change #1: Update the main run command on line 2 from:**
```toml
run = "npm run dev"
```
**To:**
```toml
run = "npm run build && npm start"
```

**Change #2: Update the deployment run command on line 10 from:**
```toml
run = ["sh", "-c", "npm run dev"]
```
**To:**
```toml
run = ["sh", "-c", "npm run build && npm start"]
```

### 2. Verify Build Process (Already Working)
The build process is correctly configured:
- ✅ `npm run build` compiles both frontend and backend
- ✅ Frontend builds to `dist/public/` directory
- ✅ Backend compiles to `dist/index.js`
- ✅ Production server serves on port 5000

### 3. Environment Configuration (Already Working)
The server is properly configured:
- ✅ Port 5000 binding with host `0.0.0.0`
- ✅ Automatic production/development mode switching based on NODE_ENV
- ✅ Static file serving from `dist/public/` in production
- ✅ All necessary dependencies included

## Testing Production Mode Locally
After updating the `.replit` file, you can test the production build:

```bash
npm run build  # Builds the application
npm start      # Runs in production mode
```

## What Happens in Production
1. **Build Phase**: Creates optimized bundles in `dist/public/assets/`
2. **Server Start**: Launches Express server with NODE_ENV=production
3. **Static Serving**: Serves built React app from `dist/public/`
4. **API Routes**: Handles backend routes on the same port

## File Structure After Build
```
dist/
├── index.js           # Compiled backend server
└── public/            # Built frontend assets
    ├── index.html     # Main HTML file
    └── assets/        # JS/CSS bundles
```

## Deployment Checklist
- [ ] Update `.replit` file deployment run command
- [ ] Verify environment variables are set
- [ ] Test build process with `npm run build`
- [ ] Deploy using Replit's deploy button

The application is production-ready - you only need to make the `.replit` file change above.