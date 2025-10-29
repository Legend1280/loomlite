# LoomLite Local Development Setup Guide

This guide provides step-by-step instructions for setting up a complete local development environment for LoomLite, including both the Python backend and the vanilla JavaScript frontend.

**Author:** Manus AI
**Date:** October 29, 2025

---

## 1. Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.9+** and `pip`
- **Node.js 16+** and `npm`
- **Git**

## 2. Clone the Repository

Clone the LoomLite repository from GitHub to your local machine:

```bash
git clone https://github.com/Legend1280/loomlite.git
cd loomlite
```

## 3. Set Up Backend (Python)

The backend is a FastAPI application located in the `backend/` directory.

### a. Create a Virtual Environment

It is highly recommended to use a virtual environment to manage Python dependencies:

```bash
python3 -m venv venv
source venv/bin/activate
```

### b. Install Dependencies

Install the required Python packages:

```bash
pip install -r backend/requirements.txt
```

### c. Set Up Environment Variables

The backend requires an OpenAI API key for some features. Create a `.env` file in the `backend/` directory:

```
# backend/.env
OPENAI_API_KEY="your_openai_api_key_here"
```

## 4. Set Up Frontend (JavaScript)

The frontend is a vanilla JavaScript application that communicates with the backend. We will use `concurrently` to run both servers with a single command.

### a. Install Node Dependencies

Install the development dependencies (only `concurrently` is needed):

```bash
npm install
```

## 5. Run the Development Servers

With both backend and frontend configured, you can now start the development servers with a single command from the **root** of the `loomlite` directory:

```bash
npm run dev
```

This command will:

1.  **Start the backend server** at `http://127.0.0.1:8000` with hot-reloading.
2.  **Start the frontend server** at `http://localhost:3000`.

Your browser should automatically open to `http://localhost:3000`, and the frontend will be configured to communicate with your local backend.

## 6. Verify Communication

- **Open your browser** to `http://localhost:3000`.
- **Open the developer console** (Right-click → Inspect → Console).
- You should see the following messages:

```
🔗 LoomLite Frontend - API Base: http://127.0.0.1:8000
📍 Environment: LOCAL DEVELOPMENT
```

- **Test a feature** that requires backend communication, such as uploading a document or clicking "Find Similar".

## 7. Project Structure Overview

```
loomlite/
├── backend/              # FastAPI backend source code
│   ├── api.py            # Main application entry point
│   ├── requirements.txt  # Python dependencies
│   └── ...
├── frontend/             # Vanilla JavaScript frontend
│   ├── index.html        # Main HTML file
│   ├── config.js         # API configuration
│   └── ...
├── node_modules/         # Node.js dependencies
├── venv/                 # Python virtual environment
├── package.json          # npm scripts for local development
└── LOCAL_SETUP_GUIDE.md  # This file
```

---

This completes the local development setup. Any changes you make to the backend (`.py` files) or frontend (`.js`, `.html`, `.css` files) will now trigger automatic reloads.
