# Overview

This is a multi-faceted inventory management system for "Grupo Crisa" that tracks and reports on inventory adjustments across multiple retail branches. The system combines a modern React-based frontend with Streamlit-based reporting tools, all integrated with Firebase and PostgreSQL for data management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The system follows a hybrid architecture combining multiple technologies:

### Frontend Architecture
- **React Application**: Built with TypeScript using Vite as the build tool
- **UI Components**: Utilizes Radix UI components with Tailwind CSS for styling
- **State Management**: React hooks and context for local state management
- **Real-time Updates**: Firebase integration for live data synchronization

### Backend Architecture
- **Node.js Server**: Express-based server using TypeScript
- **Database Layer**: Dual database approach using both PostgreSQL (with Drizzle ORM) and Firebase Realtime Database
- **Python Services**: Streamlit applications for data visualization and reporting

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM for structured data
- **Real-time Database**: Firebase Realtime Database for live updates and branch synchronization
- **File Storage**: Excel file processing for data imports

## Key Components

### 1. React Frontend
- **Dashboard**: Main interface showing branch rankings and performance metrics
- **Branch Management**: Individual branch tracking with checklist functionality
- **Authentication**: Firebase Authentication for user management
- **Real-time Sync**: Live updates across multiple users without conflicts

### 2. Streamlit Reporting Tools
- **Main Report Dashboard** (`streamlit_app.py`): Branch rankings and consolidated reporting
- **Branch-specific Reports** (`reportes_sucursal.py`): Detailed analysis per branch
- **Consolidation Tools** (`consolidado_report.py`): Excel file processing and visualization

### 3. Data Processing Scripts
- **Import Scripts**: Python scripts for Excel data processing and database imports
- **Firebase Integration**: Real-time data synchronization and conflict resolution
- **Date Formatting**: Specialized Excel serial date conversion utilities

### 4. Database Schema
- **PostgreSQL Tables**: Structured storage for adjustment records (`ajustes_sucursales`)
- **Firebase Structure**: Real-time branch data with item tracking and progress monitoring

## Data Flow

1. **Data Import**: Excel files containing inventory adjustments are processed via Python scripts
2. **Database Storage**: Data is stored in PostgreSQL for structured queries and Firebase for real-time access
3. **Frontend Display**: React application fetches data from Firebase for live updates
4. **User Interactions**: Branch selections and item updates are synchronized across all connected clients
5. **Reporting**: Streamlit applications generate visualizations and reports from PostgreSQL data

## External Dependencies

### Firebase Services
- **Realtime Database**: For live data synchronization between branches
- **Authentication**: User management and access control
- **Hosting**: Application deployment (configured but not actively used)

### Database Services
- **PostgreSQL**: Primary structured data storage via DATABASE_URL environment variable
- **Neon Database**: Cloud PostgreSQL provider integration

### Frontend Libraries
- **Radix UI**: Component library for accessible UI elements
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Framer Motion**: Animation library for enhanced user experience
- **React Query**: Data fetching and caching for optimal performance

## Deployment Configuration

### Production Build Process
- **Build Command**: `npm run build` - Compiles both frontend and backend for production
- **Frontend Build**: Vite builds React application to `dist/public/`
- **Backend Build**: esbuild compiles server code to `dist/index.js`
- **Start Command**: `npm start` - Runs production server with NODE_ENV=production

### Port Configuration
- **Production Port**: 5000 (configured in server/index.ts)
- **Host Binding**: 0.0.0.0 for external access
- **Static Files**: Served from `dist/public/` in production mode

### Required .replit Configuration Changes for Deployment
To enable production deployment, the following changes are needed in .replit file:

**IMPORTANT:** The agent cannot edit .replit files directly. You must manually make these changes:

1. **Update line 2** from:
   ```toml
   run = "npm run dev"
   ```
   to:
   ```toml
   run = "npm run build && npm start"
   ```

2. **Update line 10** in the deployment section from:
   ```toml
   run = ["sh", "-c", "npm run dev"]
   ```
   to:
   ```toml
   run = ["sh", "-c", "npm run build && npm start"]
   ```

### Environment Variables
- **NODE_ENV**: Set to "production" for deployment
- **DATABASE_URL**: PostgreSQL connection string
- **Firebase configuration**: Various FIREBASE_* environment variables

### Build Verification
- Build output creates optimized bundles in `dist/public/assets/`
- Production server serves static files and API routes on port 5000
- Application automatically switches between development and production modes based on NODE_ENV

### Python Dependencies
- **Streamlit**: Web application framework for reporting tools
- **Pandas**: Data manipulation and analysis
- **SQLAlchemy**: Database ORM for Python scripts
- **Matplotlib/Seaborn**: Data visualization libraries

## Deployment Strategy

### Development Environment
- **Vite Dev Server**: Hot-reload development for React frontend
- **Streamlit Dev Server**: Configured on port 8504 for reporting tools
- **TypeScript Compilation**: Real-time type checking and compilation

### Production Build
- **Frontend**: Vite build process creating optimized static assets
- **Backend**: ESBuild compilation for Node.js server deployment
- **Database Migrations**: Drizzle Kit for schema management

### Environment Configuration
- **Firebase Config**: Dual environment setup (development/production)
- **Database URLs**: Environment-based connection strings
- **Port Configuration**: Streamlit port explicitly set via environment variables

### Key Architectural Decisions

1. **Dual Database Approach**: PostgreSQL for complex queries and reporting, Firebase for real-time collaboration
2. **Hybrid Framework Strategy**: React for interactive UI, Streamlit for rapid report development
3. **Branch Isolation**: Each branch operates independently to prevent cross-contamination of data
4. **Real-time Synchronization**: Firebase enables multiple users to work simultaneously without conflicts
5. **Excel Integration**: Direct Excel file processing to accommodate existing business workflows
6. **Season-Specific Codes**: System uses real product codes (TA02B, TA139S00, TV02, etc.) for summer season tracking

### Recent Changes

**July 28, 2025**
- Updated to use actual product codes for summer season (86 specific codes)
- Replaced generic sequential codes with real codes: TA02B, TA139S00, TA139V00, etc.
- Implemented forced migration system to update existing data
- Fixed code visualization issues in branch checklists
- Removed "Temporadas" and "Verificar Códigos" buttons per user request
- Simplified interface to show only branch selector and checklist
- Improved progress calculation with useMemo for better reactivity
- Fixed data duplication issues affecting progress bars and animations
- Enhanced debugging with detailed progress logging
- **Deployment Configuration Fix**: Created deployment instructions for fixing production build configuration
- **Documentation Update**: Added DEPLOYMENT_FIX.md with step-by-step manual fix for .replit file

The system prioritizes real-time collaboration, data accuracy, and ease of use for inventory tracking across multiple retail locations using authentic product codes.