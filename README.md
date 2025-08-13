# Vercel Clone - Full-Stack Deployment Platform

A complete deployment platform clone inspired by Vercel, featuring a modern React frontend and multiple Node.js microservices for seamless GitHub repository deployment with real-time status tracking.

![Vercel Clone Demo](https://img.shields.io/badge/Status-Active-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-232F3E?logo=amazon-aws&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)

## 🚀 Features

- **GitHub Integration**: Deploy any GitHub repository with a single URL
- **Real-time Status Tracking**: Live deployment progress with visual indicators
- **Microservices Architecture**: Scalable backend with specialized services
- **AWS S3 Integration**: Reliable file storage and static site hosting
- **Redis Queue Management**: Efficient deployment queue processing
- **Subdomain Routing**: Each deployment gets its own subdomain
- **Modern UI**: Beautiful dark-themed interface with Tailwind CSS and Radix UI
- **TypeScript**: Full type safety across frontend and backend

## 🏗️ Architecture

The platform consists of four main components:

### Frontend (`/frontend`)
- **Framework**: React 18 with TypeScript and Vite
- **UI Library**: Tailwind CSS + Radix UI components
- **Features**: 
  - Deployment form with GitHub URL input
  - Real-time status tracking with polling
  - Dark/light theme support
  - Responsive design

### Upload Service (`/vercel-upload-service`)
- **Purpose**: Handles repository cloning and file uploads
- **Process**: 
  - Clones GitHub repositories
  - Uploads files to AWS S3
  - Queues deployment jobs in Redis
  - Provides deployment status API

### Deploy Service (`/vercel-deploy-service`)
- **Purpose**: Processes deployment queue and builds projects
- **Process**:
  - Downloads source files from S3
  - Builds the project (supports various frameworks)
  - Uploads built files back to S3
  - Updates deployment status

### Request Handler (`/vercel-request-handler`)
- **Purpose**: Serves deployed applications
- **Features**:
  - Subdomain-based routing (`{deployment-id}.localhost`)
  - Static file serving from S3
  - Proper MIME type handling
  - Error handling for missing files

## 🛠️ Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + Radix UI
- Lucide React (icons)
- Axios (HTTP client)

### Backend
- Node.js + TypeScript
- Express.js (web framework)
- Redis (queue management)
- AWS SDK (S3 integration)
- Simple Git (repository cloning)

### Infrastructure
- AWS S3 (file storage)
- Redis (message queue)
- Docker-ready architecture

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Redis server
- AWS account with S3 access
- Git

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd vercel-clone
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend service dependencies
cd ../vercel-upload-service
npm install

cd ../vercel-deploy-service
npm install

cd ../vercel-request-handler
npm install
```

### 3. Environment Configuration

Create `.env` files in each service directory:

**vercel-upload-service/.env**
```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_s3_bucket_name
REDIS_URL=redis://localhost:6379
```

**vercel-deploy-service/.env**
```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_s3_bucket_name
REDIS_URL=redis://localhost:6379
```

**vercel-request-handler/.env**
```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_s3_bucket_name
PORT=3001
```

### 4. AWS S3 Setup

1. Create an S3 bucket
2. Configure bucket permissions for public read access (for deployed sites)
3. Create IAM user with S3 full access permissions
4. Note down access keys

### 5. Redis Setup

Install and start Redis:
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis-server

# Windows
# Download and install Redis from official website
```

## 🚀 Running the Application

### Development Mode

Start all services in separate terminals:

```bash
# Terminal 1: Frontend
cd frontend
npm run dev

# Terminal 2: Upload Service
cd vercel-upload-service
npm run dev

# Terminal 3: Deploy Service
cd vercel-deploy-service
npm run dev

# Terminal 4: Request Handler
cd vercel-request-handler
npm run dev
```

### Access Points
- **Frontend**: http://localhost:5173
- **Upload API**: http://localhost:3000
- **Request Handler**: http://localhost:3001
- **Deployed Apps**: http://{deployment-id}.localhost:3001

## 📖 Usage

1. **Open the frontend** at http://localhost:5173
2. **Enter a GitHub repository URL** in the deployment form
3. **Click Deploy** to start the deployment process
4. **Monitor progress** with real-time status updates
5. **Access your deployed app** via the provided subdomain link

### Supported Repository Types
- Static HTML/CSS/JS sites
- React applications
- Next.js applications (with export configuration)
- Vue.js applications
- Any project with a build process

## 🔧 Configuration

### Adding Build Support for New Frameworks

Edit `vercel-deploy-service/src/utils.ts` to add support for additional frameworks:

```typescript
// Add framework detection logic
// Add corresponding build commands
// Handle framework-specific output directories
```

### Custom Domains

To use custom domains instead of localhost subdomains:

1. Configure DNS to point to your server
2. Update the request handler to handle your domain
3. Modify the frontend to show correct URLs

## 🐳 Docker Support

Each service can be containerized. Example Dockerfile structure:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 Testing

```bash
# Run frontend tests
cd frontend
npm test

# Run backend tests (if implemented)
cd vercel-upload-service
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 API Documentation

### Upload Service API

**POST /deploy**
```json
{
  "repoUrl": "https://github.com/user/repo.git"
}
```

**GET /status?id={deployment-id}**
```json
{
  "status": "queued|building|deploying|deployed|failed"
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Redis Connection Error**
   - Ensure Redis is running
   - Check Redis URL in environment variables

2. **AWS S3 Permissions**
   - Verify IAM user has S3 access
   - Check bucket permissions

3. **Build Failures**
   - Check deployment logs in deploy service
   - Ensure repository has proper build configuration

4. **Subdomain Not Working**
   - Add entry to hosts file: `127.0.0.1 {deployment-id}.localhost`
   - Check request handler is running on port 3001

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [Vercel](https://vercel.com)
- Built with amazing open-source tools and libraries
- Thanks to the React and Node.js communities

## 🔮 Future Enhancements

- [ ] Database integration for deployment history
- [ ] User authentication and project management
- [ ] Custom domain support
- [ ] Environment variables management
- [ ] Build logs and debugging tools
- [ ] Webhook integration for auto-deployments
- [ ] Performance monitoring and analytics
- [ ] Multi-region deployment support

---

**Happy Deploying! 🚀**
