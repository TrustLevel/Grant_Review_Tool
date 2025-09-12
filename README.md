# TrustLevel - Proposal Reviewing Tool

> **A self-regulating evaluation system that uses algorithms and reputation to help communities ensure quality decision-making - similar to scientific peer review, but for decentralized funding and governance.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black.svg)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7+-green.svg)](https://www.mongodb.com/)

## 🌟 What is TrustLevel?

TrustLevel is an intelligent proposal management system designed for decentralized funding programs like Cardano Catalyst. It combines smart assignment algorithms, quality control through peer reviews, and gamification to create a fair, efficient, and transparent review process.

### 🎯 Key Features

- **🌡️ Temperature Check System**: Quick quality assessment before detailed reviews
- **🧠 Smart Assignment Algorithm**: AI-powered matching based on expertise and interests
- **👥 Peer Review Quality Control**: Multi-tier validation for review quality
- **🎮 Gamification & REP System**: Reward reviewers with points and mission completion
- **⚡ Administrative Control**: Comprehensive user management and analytics
- **🔒 Secure Authentication**: Supabase integration with JWT tokens
- **📊 AI-Enhanced Analysis**: Claude AI generates proposal summaries and insights

### 🏆 Perfect For

- **DAOs & Grant Programs**: Streamline your proposal evaluation process
- **Funding Organizations**: Ensure fair and consistent review standards
- **Decentralized Communities**: Enable transparent, merit-based decision-making


## 🏗️ Architecture Overview

TrustLevel is built with a modern, scalable architecture:

### Tech Stack

**Backend (API)**
- **Framework**: Node.js + Express.js
- **Database**: MongoDB + Mongoose ODM
- **Authentication**: JWT tokens + Supabase integration
- **AI Integration**: Anthropic Claude API
- **Deployment**: AWS App Runner + ECR

**Frontend (Web App)**
- **Framework**: Next.js 15 + React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase client
- **Deployment**: AWS Amplify

**Database Models**
- **Users**: Reviewer profiles with expertise and interests
- **Proposals**: Catalyst proposals with AI summaries
- **Reviews**: 6-category scoring system with detailed feedback
- **PeerReviews**: Quality control and reputation management

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   (MongoDB)     │
│                 │    │                 │    │                 │
│ • User Interface│    │ • REST API      │    │ • User Data     │
│ • Authentication│    │ • Business Logic│    │ • Proposals     │
│ • Real-time UI  │    │ • AI Integration│    │ • Reviews       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │  External APIs  │
                    │                 │
                    │ • Supabase Auth │
                    │ • Claude AI     │
                    │ • Catalyst API  │
                    └─────────────────┘
```

## 🎮 How It Works

### 1. User Onboarding
- **Magic Link Authentication** via Supabase
- **Expertise Assessment** across Technical, Community, and Product areas
- **Interest Selection** from 13 specialized categories
- **Admin Approval Process** for quality control

### 2. Smart Assignment System
- **Interest-First Matching**: Prioritizes reviewer interests
- **Urgency-Based Sorting**: Urgent proposals get priority
- **Conflict Detection**: Prevents bias from affiliations
- **Workload Balancing**: Distributes assignments fairly

### 3. Review Process
- **Temperature Check**: Quick quality assessment (Promising vs Low-quality)
- **6-Category Scoring**: Detailed evaluation across key areas
- **Draft Saving**: Reviewers can work incrementally
- **Early Exit**: Skip low-quality proposals to save time

### 4. Peer Review Quality Control
- **Multi-tier Validation**: Each review gets peer-reviewed
- **Quality Assessment**: Constructive feedback on review quality
- **REP Points System**: 30 points for reviews, 15 for peer reviews


### Project Structure
```
proposal-reviewing-tool/
├── backend/               # Node.js API server
│   ├── src/
│   │   ├── models/       # MongoDB schemas
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   └── scripts/      # Data processing
│   └── Dockerfile        # Container configuration
├── frontend/             # Next.js web application
│   └── src/app/         # App Router pages
├── tests/               # Comprehensive test suite
├── docs/                # Documentation
└── README.md           # This file
```

## 📖 Documentation

- **[📚 Full Documentation](./docs/README.md)** - Comprehensive guides and API reference
- **[👤 User Guide](./docs/user-guide/getting-started.md)** - How to use TrustLevel as a reviewer
- **[⚙️ Admin Guide](./docs/admin-guide/user-management.md)** - Administrative features and management
- **[💻 Developer Guide](./docs/developer-guide/api-reference.md)** - Technical documentation and APIs
- **[🚀 Deployment Guide](./docs/deployment/installation.md)** - Production setup and hosting

## 🧪 Testing

TrustLevel includes a comprehensive testing suite covering:

- **Core System**: API endpoints, database operations, security
- **Authentication**: JWT validation, role-based access control
- **Workflows**: End-to-end user journeys and business logic
- **Database**: Performance testing, concurrent access, data integrity
- **Frontend**: Page loading, API integration, user interactions

See [Testing Documentation](./tests/README.md) for detailed information.

## 🚀 Deployment

For production deployment to AWS (App Runner + Amplify) and detailed configuration, see the [Deployment Guide](./docs/deployment/installation.md).


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Cardano Community** - Funded through Catalyst Fund 12
- **Anthropic** - AI integration powered by Claude
- **Open Source Community** - Built with amazing open-source tools

## 📞 Support

- **Documentation**: [docs/](./docs/README.md)
- **Issues**: [GitHub Issues](https://github.com/your-org/proposal-reviewing-tool/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/proposal-reviewing-tool/discussions)

---

**Made with ❤️ for the decentralized future**

*TrustLevel is an open-source project building the future of transparent, merit-based decision-making for decentralized communities.*