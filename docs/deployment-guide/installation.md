# Installation & Deployment Guide

Complete guide for setting up TrustLevel in development and production environments.

## Development Installation

### Prerequisites
- **Node.js 18+** and **npm**
- **MongoDB 7+** 
- **Git**
- **Supabase account** for authentication

### 1. Clone and Setup
```bash
git clone https://github.com/your-org/proposal-reviewing-tool.git
cd proposal-reviewing-tool

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies  
cd ../frontend
npm install
```

### 2. Database Setup

#### Option A: Docker (Recommended)
```bash
cd backend
docker-compose up -d mongodb
```

#### Option B: Local MongoDB
```bash
# macOS
brew install mongodb/brew/mongodb-community
brew services start mongodb/brew/mongodb-community

# Ubuntu/Linux
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

### 3. Environment Configuration

**Backend (`backend/.env`):**
```env
MONGODB_URI=mongodb://localhost:27017/proposal_reviewing_tool
JWT_SECRET=your_secure_random_string_here
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ANTHROPIC_API_KEY=your_anthropic_key_here
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. **Authentication > Settings**:
   - Enable **Magic Link** authentication
   - Add `http://localhost:3000/auth/callback` as redirect URL
3. Copy project URL and anon key to frontend `.env.local`

### 5. Start Development Servers

```bash
# Terminal 1 - Backend API
cd backend
npm run dev  # Runs on port 3001

# Terminal 2 - Frontend  
cd frontend
npm run dev  # Runs on port 3000
```

### 6. Verify Setup
- Visit [http://localhost:3000](http://localhost:3000)
- Sign up with your email
- Check [http://localhost:3001/health](http://localhost:3001/health) for API status

### 7. Load Initial Data (Optional)

```bash
cd backend/src/scripts

# Import Catalyst proposals
node ImportCatalystProposals.js

# Process and categorize proposals
node ProcessCatalystProposals.js

# Generate AI summaries (requires Anthropic API key)
node GenerateAISummaries.js
```

## Production Deployment

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AWS Amplify   │    │  AWS App Runner │    │  MongoDB Atlas  │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
│                 │    │                 │    │                 │
│ • Next.js Build │    │ • Docker Image  │    │ • Managed DB    │
│ • CDN Hosting   │    │ • Auto Scaling  │    │ • Backups       │
│ • HTTPS/SSL     │    │ • Load Balancer │    │ • Monitoring    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 1. Database - MongoDB Atlas

1. **Create Cluster**:
   - Go to [mongodb.com/atlas](https://mongodb.com/atlas)
   - Create new cluster (M10+ for production)
   - Configure region closest to your users

2. **Security Setup**:
   - Create database user with strong password
   - Configure network access (IP whitelist)
   - Enable database authentication

3. **Get Connection String**:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/proposal_reviewing_tool?retryWrites=true&w=majority
   ```

### 2. Backend - AWS App Runner + ECR

#### Prepare Docker Image

**Create `backend/Dockerfile`:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["npm", "start"]
```

#### Build and Push to ECR

```bash
cd backend

# Create ECR repository
aws ecr create-repository --repository-name trustlevel-backend

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and tag image
docker build -t trustlevel-backend .
docker tag trustlevel-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/trustlevel-backend:latest

# Push to ECR
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/trustlevel-backend:latest
```

#### Deploy to App Runner

1. **Create App Runner Service**:
   - AWS Console > App Runner > Create Service
   - Source: Container registry
   - Select your ECR image
   - Configure automatic deployments

2. **Service Configuration**:
   ```yaml
   Runtime: Docker
   Build command: (none - using pre-built image)
   Start command: npm start
   Port: 3001
   ```

3. **Environment Variables**:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/proposal_reviewing_tool
   JWT_SECRET=your_production_jwt_secret_256_chars
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend-domain.amplifyapp.com
   ANTHROPIC_API_KEY=your_anthropic_key
   ```

### 3. Frontend - AWS Amplify

#### Create Amplify Configuration

**Create `amplify.yml` in project root:**
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/.next
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
```

#### Deploy to Amplify

1. **Connect Repository**:
   - AWS Console > Amplify > Connect app
   - Connect GitHub/GitLab repository
   - Select branch (main/production)

2. **Build Settings**:
   - Use the `amplify.yml` configuration
   - Build command: `npm run build`
   - Output directory: `frontend/.next`

3. **Environment Variables**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_API_URL=https://your-app-runner-url.com
   ```

4. **Custom Domain** (Optional):
   - Add custom domain in Amplify console
   - SSL certificate automatically provisioned
   - Configure DNS records as instructed

### 4. Security Configuration

#### CORS Setup
Update backend CORS for production domains:

```javascript
// backend/src/server.js
const corsOptions = {
  origin: [
    'https://your-frontend-domain.amplifyapp.com',
    'https://your-custom-domain.com'
  ],
  credentials: true
};
app.use(cors(corsOptions));
```

#### JWT Security
```env
# Generate secure JWT secret (256+ characters)
JWT_SECRET=your_very_long_and_secure_random_string_for_production_use_only
```

#### Database Security
- Enable MongoDB Atlas authentication
- Configure IP whitelist (App Runner IPs)
- Enable database encryption at rest
- Set up automated backups

### 5. Monitoring & Health Checks

#### Backend Health Endpoints
```javascript
// Already implemented in server.js
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

### 6. SSL and Domain Configuration

#### App Runner Custom Domain
1. App Runner Console > Service > Custom domains
2. Add domain and configure DNS
3. SSL certificate automatically provisioned

#### Supabase Configuration
Update Supabase with production URLs:
- **Site URL**: `https://your-frontend-domain.com`
- **Redirect URLs**: `https://your-frontend-domain.com/auth/callback`

## 🔧 Environment Variables Reference

### Backend Production Environment
```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db

# Authentication
JWT_SECRET=your_256_character_production_secret

# Server
PORT=3001
NODE_ENV=production

# CORS
FRONTEND_URL=https://your-frontend-domain.com

# AI Integration
ANTHROPIC_API_KEY=your_anthropic_key

# Monitoring (optional)
LOG_LEVEL=info
```

### Frontend Production Environment
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API
NEXT_PUBLIC_API_URL=https://your-app-runner-url.com

# Analytics (optional)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=your_ga_id
```

## 🧪 Production Testing

### Deployment Verification
```bash
# Test backend health
curl https://your-app-runner-url.com/health

# Test frontend
curl https://your-frontend-domain.com

# Test authentication flow
curl -X POST https://your-app-runner-url.com/api/auth/verify
```

### Load Testing (Optional)
```bash
# Install artillery
npm install -g artillery

# Create test configuration
# artillery.yml - configure load test scenarios

# Run load test
artillery run artillery.yml
```

## CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Build and Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker build -t $ECR_REPOSITORY backend/
          docker tag $ECR_REPOSITORY:latest $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
```

## Database Migration

### Production Data Migration
```bash
# Backup current database
mongodump --uri="mongodb+srv://..." --out backup-$(date +%Y%m%d)

# Run migration scripts
cd backend/src/scripts
node migrate-production.js

# Verify migration
node verify-migration.js
```

## Troubleshooting

### Common Issues

**App Runner deployment fails:**
- Check Dockerfile syntax
- Verify port configuration (3001)
- Check environment variables

**Frontend can't reach backend:**
- Verify CORS configuration
- Check API URL in frontend env
- Confirm App Runner URL is correct

**Database connection issues:**
- Verify MongoDB Atlas IP whitelist
- Check connection string format
- Confirm database user permissions

**Authentication problems:**
- Verify Supabase configuration
- Check redirect URLs
- Confirm JWT secret is consistent

### Logs and Debugging

```bash
# App Runner logs
aws logs describe-log-groups
aws logs tail /aws/apprunner/trustlevel-backend

# Amplify build logs
# Available in Amplify Console > App > Build logs

# MongoDB Atlas logs
# Available in Atlas Console > Database > Monitoring
```

---

Need help? Create an issue in the repository.