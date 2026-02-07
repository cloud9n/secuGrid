# SecuGrid | AI-Powered Security Operations


<div align="center">
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)
  [![Node.js](https://img.shields.io/badge/Node.js-22-green.svg)](https://nodejs.org/)
  [![Prisma](https://img.shields.io/badge/Prisma-6.3-indigo.svg)](https://www.prisma.io/)

  **Autonomous AI Security Auditing & Vulnerability Scanning Platform**
</div>

## 🛡️ Overview

**SecuGrid** is an advanced security operations platform that leverages specialized AI agents to autonomously audit code, scan infrastructure, simulate attacks, and generate detailed vulnerability reports. Designed for developers and security teams, it provides real-time threat intelligence and automated remediation suggestions.

## ✨ Key Features

- **🤖 Autonomous AI Agents**: Deploy specialized agents for Reconnaissance, Static Analysis, Fuzzing, and Penetration Testing.
- **🔍 Multi-Vector Scanning**:
    - **URL Audit**: Passive reconnaissance and vulnerability scanning of live web applications.
    - **GitHub Integration**: Connect private/public repositories via PAT to scan source code directly.
    - **Source Code Analysis**: Paste snippets or upload files for instant security review.
    - **Supply Chain Security**: Detect hardcoded secrets and dependency vulnerabilities.
- **📊 Real-Time Dashboard**: Visualize attack vectors, agent status, and grid integrity on a live world map.
- **💳 Credit System**: Pay-as-you-go model integrated with **Paystack** for flexible resource allocation.
- **🔐 Secure Identity**: Full authentication system with JWT, role-based access, and API key management.
- **📝 Comprehensive Reporting**: Generate detailed PDF/HTML audit reports with severity scoring and remediation steps.

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, TailwindCSS, Lucide Icons, Recharts
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite (Dev), Prisma ORM
- **AI Engine**: Google Gemini 1.5 Pro (via `@google/genai`)
- **Payments**: Paystack API
- **Tooling**: Vite, ESLint

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- npm or yarn
- Google Gemini API Key
- Paystack Public/Secret Keys (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/cloud9n/secuGrid.git
   cd secugrid
   ```

2. **Install Dependencies**
   ```bash
   # Install root dependencies (Frontend)
   npm install

   # Install server dependencies
   cd server
   npm install
   cd ..
   ```

3. **Environment Setup**
    - Create `.env` in `server/` directory:
      ```env
      PORT=5000
      DATABASE_URL="file:./dev.db"
      JWT_SECRET="your-super-secret-key"
      PAYSTACK_SECRET_KEY="sk_test_..."
      ```
    - Create `.env.local` in root directory:
      ```env
      VITE_GEMINI_API_KEY="your-gemini-api-key"
      ```

4. **Initialize Database**
   ```bash
   cd server
   npx prisma migrate dev --name init
   cd ..
   ```

5. **Run Application**
   Open two terminals:

   **Terminal 1 (Backend):**
   ```bash
   cd server
   npm run dev
   ```

   **Terminal 2 (Frontend):**
   ```bash
   npm run dev
   ```

   Access the app at `http://localhost:5173`

### Deployment

For detailed instructions on deploying to Render, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - Create a new account
- `POST /api/auth/login` - Authenticate and receive JWT

### User Operations
- `GET /api/user/profile` - Get user details and credits
- `POST /api/user/api-keys` - Generate programmatic access keys
- `GET /api/scans/history` - Fetch audit logs

### GitHub Integration
- `POST /api/github/connect` - Link GitHub account via PAT
- `GET /api/github/repos` - List accessible repositories

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
<div align="center">
  Built with ❤️ by the SecuGrid Team
</div>
