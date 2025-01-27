// 1. BASIC NEXT.JS PROJECT STRUCTURE

/**
trustlevel-poc/
├── .github/                    # GitHub Actions workflows
├── public/                     # Static files
├── src/
│   ├── app/                   # Next.js 14 App Router
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   ├── dashboard/         # Dashboard routes
│   │   │   └── page.tsx
│   │   └── reviews/          # Review routes
│   │       └── page.tsx
│   ├── components/           # React components
│   │   ├── ui/              # shadcn/ui components
│   │   └── shared/          # Shared components
│   └── lib/                 # Utilities and shared code
└── package.json
**/

// 2. CORE FILES SETUP

// src/app/layout.tsx
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}

// src/app/page.tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">TrustLevel POC</h1>
    </main>
  );
}

// src/components/shared/Navigation.tsx
export function Navigation() {
  return (
    <nav className="flex items-center justify-between p-4 bg-white shadow">
      <div className="text-xl font-bold">TrustLevel</div>
      <div className="flex gap-4">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/reviews">Reviews</Link>
      </div>
    </nav>
  );
}

// 3. TAILWIND CONFIGURATION

// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

// 4. AWS AMPLIFY CONFIGURATION

// amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - env | grep -e NEXT_PUBLIC_ >> .env.production
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*

// 5. ENVIRONMENT CONFIGURATION

// .env.example
NEXT_PUBLIC_API_URL=https://api.trustlevel.io
NEXT_PUBLIC_APP_ENV=development

// 6. GITHUB ACTIONS WORKFLOW

// .github/workflows/deploy.yml
name: Deploy to AWS Amplify
on:
  push:
    branches: [ main, develop ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
          
      - name: Deploy to Amplify
        run: |
          aws amplify start-job --app-id ${{ secrets.AMPLIFY_APP_ID }} --branch-name ${{ github.ref_name }} --job-type RELEASE

// 7. PACKAGE.JSON CONFIGURATION

{
  "name": "trustlevel-poc",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18",
    "react-dom": "^18",
    "@radix-ui/react-slot": "^1.0.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10",
    "postcss": "^8",
    "tailwindcss": "^3",
    "typescript": "^5",
    "eslint": "^8",
    "eslint-config-next": "14.0.0"
  }
}

// 8. DEPLOYMENT INSTRUCTIONS

/**
AWS Amplify Setup Steps:

1. Create New App in AWS Amplify Console:
   - Go to AWS Amplify Console
   - Click "New App" → "Host Web App"
   - Connect to GitHub repository

2. Configure Build Settings:
   - Select branch to deploy
   - Review/modify build settings
   - Add environment variables if needed

3. Configure Domain:
   - Go to Domain Management
   - Add custom domain if needed
   - Configure SSL certificate

4. Set Up Environment Variables:
   - Go to App Settings → Environment Variables
   - Add required environment variables
   - Make sure to prefix client-side variables with NEXT_PUBLIC_

5. Monitor Deployment:
   - Watch build progress in Amplify Console
   - Check build logs for any issues
   - Verify deployment success

Development Workflow:

1. Local Development:
   $ npm install
   $ npm run dev

2. Testing Build:
   $ npm run build
   $ npm start

3. Deployment:
   - Push to main/develop branch
   - GitHub Actions will trigger deployment
   - Monitor in AWS Amplify Console
**/
