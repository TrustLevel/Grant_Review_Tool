This Repository is work in progress!

![image](https://github.com/user-attachments/assets/256fef40-6366-4e76-893a-f2100ad23f3e)
-> No Redis for POC


# Timeline:
1. Review Service + DB Models
2. Basic Review Frontend
3. Auth Service + User Models
4. Auth Frontend Components
5. Reputation Service
6. Peer Review Service
7. AI Integration
8. Export Features

# Tools:
Hosting: AWS
Deploy: Github
Database: MongoDB

# Core data flows:
User authentication
Review process flow
Peer review process
Reputation & rewards
Data export


## Frontend Workflow:

# Development:
Develop locally
Push changes to GitHub
Create pull requests for review (optional)


# Frontend (AWS Amplify):
Automatically detects changes in GitHub
Builds Next.js application
Runs tests
Deploys to production
No manual intervention needed


# Backend (GitHub Actions):
Triggered by changes to backend code
Builds Docker container
Runs tests
Pushes to Amazon ECR
Updates ECS service
All automated via GitHub Actions

# Main things to do:
Initial setup connecting GitHub to AWS services
Set up environment variables in AWS
