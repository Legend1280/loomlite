# Loom Lite MVP - Deployment Guide

## Overview

This guide covers deploying Loom Lite to various platforms including local servers, cloud providers, and containerized environments.

---

## 🐳 Docker Deployment (Recommended)

### Create Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy application files
COPY backend/ /app/backend/
COPY frontend/ /app/frontend/
COPY README.md /app/

# Install Python dependencies
RUN pip install --no-cache-dir fastapi uvicorn

# Initialize database
RUN cd /app/backend && python3.11 sample_data.py

# Expose port
EXPOSE 8000

# Start server
CMD ["python3.11", "-c", "from fastapi import FastAPI; from fastapi.staticfiles import StaticFiles; from fastapi.responses import RedirectResponse; import uvicorn; import sys; sys.path.insert(0, 'backend'); from main import app; app.mount('/frontend', StaticFiles(directory='frontend'), name='frontend'); @app.get('/', include_in_schema=False)\ndef redirect_to_frontend(): return RedirectResponse(url='/frontend/index.html'); uvicorn.run(app, host='0.0.0.0', port=8000)"]
```

### Build and Run

```bash
# Build image
docker build -t loom-lite-mvp .

# Run container
docker run -d -p 8000:8000 --name loom-lite loom-lite-mvp

# Check logs
docker logs -f loom-lite

# Stop container
docker stop loom-lite

# Remove container
docker rm loom-lite
```

### Docker Compose

```yaml
version: '3.8'

services:
  loom-lite:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./backend/loom_lite.db:/app/backend/loom_lite.db
    environment:
      - PYTHONUNBUFFERED=1
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

---

## ☁️ Cloud Deployment

### Vercel (Frontend + Serverless API)

**Note:** Requires adapting backend to serverless functions.

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/main.py",
      "use": "@vercel/python"
    },
    {
      "src": "frontend/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/main.py"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/$1"
    }
  ]
}
```

3. Deploy:
```bash
vercel --prod
```

### Heroku

1. Create `Procfile`:
```
web: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

2. Create `runtime.txt`:
```
python-3.11.0
```

3. Deploy:
```bash
heroku create loom-lite-mvp
git push heroku main
heroku open
```

### AWS EC2

1. Launch Ubuntu instance
2. SSH into instance
3. Install dependencies:
```bash
sudo apt update
sudo apt install python3.11 python3-pip sqlite3 -y
```

4. Clone repository and start:
```bash
git clone https://github.com/your-org/loom-lite-mvp.git
cd loom-lite-mvp
pip3 install fastapi uvicorn
cd backend && python3.11 sample_data.py
cd .. && ./start.sh
```

5. Configure security group to allow port 8000

### DigitalOcean App Platform

1. Create `app.yaml`:
```yaml
name: loom-lite-mvp
services:
  - name: web
    github:
      repo: your-org/loom-lite-mvp
      branch: main
    build_command: pip install fastapi uvicorn && cd backend && python3.11 sample_data.py
    run_command: cd backend && uvicorn main:app --host 0.0.0.0 --port 8080
    http_port: 8080
    instance_count: 1
    instance_size_slug: basic-xxs
```

2. Deploy via DigitalOcean dashboard or CLI

---

## 🖥️ Local Server Deployment

### Systemd Service (Linux)

1. Create service file `/etc/systemd/system/loom-lite.service`:
```ini
[Unit]
Description=Loom Lite MVP
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/loom-lite-mvp
ExecStart=/usr/bin/python3.11 -c "from fastapi import FastAPI; from fastapi.staticfiles import StaticFiles; from fastapi.responses import RedirectResponse; import uvicorn; import sys; sys.path.insert(0, 'backend'); from main import app; app.mount('/frontend', StaticFiles(directory='frontend'), name='frontend'); @app.get('/', include_in_schema=False)\ndef redirect_to_frontend(): return RedirectResponse(url='/frontend/index.html'); uvicorn.run(app, host='0.0.0.0', port=8000)"
Restart=always

[Install]
WantedBy=multi-user.target
```

2. Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable loom-lite
sudo systemctl start loom-lite
sudo systemctl status loom-lite
```

### Nginx Reverse Proxy

1. Install Nginx:
```bash
sudo apt install nginx -y
```

2. Create config `/etc/nginx/sites-available/loom-lite`:
```nginx
server {
    listen 80;
    server_name loom-lite.example.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/loom-lite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d loom-lite.example.com
```

---

## 🔒 Production Considerations

### Environment Variables

Create `.env` file:
```bash
DATABASE_URL=/app/backend/loom_lite.db
API_KEY=your_secure_api_key_here
CORS_ORIGINS=https://loom-lite.example.com
LOG_LEVEL=info
```

Load in `backend/main.py`:
```python
from dotenv import load_dotenv
import os

load_dotenv()

DB_PATH = os.getenv("DATABASE_URL", "backend/loom_lite.db")
API_KEY = os.getenv("API_KEY")
```

### Database Backup

```bash
# Backup script
#!/bin/bash
BACKUP_DIR=/backups/loom-lite
DATE=$(date +%Y%m%d_%H%M%S)
sqlite3 /app/backend/loom_lite.db ".backup '$BACKUP_DIR/loom_lite_$DATE.db'"
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
```

Add to crontab:
```bash
0 2 * * * /usr/local/bin/backup-loom-lite.sh
```

### Monitoring

Install Prometheus exporter:
```bash
pip install prometheus-fastapi-instrumentator
```

Add to `backend/main.py`:
```python
from prometheus_fastapi_instrumentator import Instrumentator

Instrumentator().instrument(app).expose(app)
```

### Logging

Configure structured logging:
```python
import logging
from logging.handlers import RotatingFileHandler

handler = RotatingFileHandler(
    'logs/loom-lite.log',
    maxBytes=10000000,
    backupCount=5
)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[handler]
)
```

### Rate Limiting

Add rate limiting middleware:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/search")
@limiter.limit("10/minute")
def search(request: Request, q: str):
    # ...
```

---

## 🧪 Testing Deployment

### Health Check Endpoint

Add to `backend/main.py`:
```python
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected" if check_db() else "disconnected",
        "timestamp": datetime.now().isoformat()
    }
```

### Load Testing

Using Apache Bench:
```bash
ab -n 1000 -c 10 http://localhost:8000/search?q=revenue
```

Using wrk:
```bash
wrk -t4 -c100 -d30s http://localhost:8000/search?q=revenue
```

---

## 📊 Performance Optimization

### Database Indexes

```sql
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_concept_label_type ON Concept(label, type);
CREATE INDEX IF NOT EXISTS idx_mention_doc_concept ON Mention(doc_id, concept_id);
CREATE INDEX IF NOT EXISTS idx_tag_category_value ON Tag(category, value);
```

### Caching

Add Redis caching:
```python
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis

@app.on_event("startup")
async def startup():
    redis = aioredis.from_url("redis://localhost")
    FastAPICache.init(RedisBackend(redis), prefix="loom-lite-cache")

@app.get("/doc/{doc_id}/ontology")
@cache(expire=3600)
async def get_doc_ontology(doc_id: str):
    # ...
```

### CDN for Static Files

Use CloudFlare or AWS CloudFront for frontend assets.

---

## 🔄 Continuous Deployment

### GitHub Actions

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy Loom Lite

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.11
      
      - name: Install dependencies
        run: pip install fastapi uvicorn
      
      - name: Run tests
        run: pytest tests/
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /app/loom-lite-mvp
            git pull
            sudo systemctl restart loom-lite
```

---

## 📦 Packaging

### Create Distribution

```bash
# Create tarball
tar -czf loom-lite-mvp-v1.0.0.tar.gz \
  backend/ frontend/ docs/ \
  README.md DEPLOYMENT.md start.sh

# Create zip
zip -r loom-lite-mvp-v1.0.0.zip \
  backend/ frontend/ docs/ \
  README.md DEPLOYMENT.md start.sh
```

### Python Package (Optional)

Create `setup.py`:
```python
from setuptools import setup, find_packages

setup(
    name="loom-lite",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "fastapi>=0.104.0",
        "uvicorn>=0.24.0",
    ],
    entry_points={
        "console_scripts": [
            "loom-lite=backend.main:main",
        ],
    },
)
```

Install:
```bash
pip install -e .
```

---

## 🚨 Troubleshooting

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000
# Kill process
kill -9 <PID>
```

### Database Locked

```bash
# Check for locks
fuser backend/loom_lite.db
# Kill locking process
fuser -k backend/loom_lite.db
```

### Memory Issues

Increase worker memory:
```bash
uvicorn main:app --workers 4 --limit-concurrency 100
```

---

## 📞 Support

For deployment issues:
- Documentation: https://docs.loom-lite.com/deployment
- GitHub Issues: https://github.com/your-org/loom-lite-mvp/issues
- Email: devops@loom-lite.com

---

**Version:** 1.0.0  
**Last Updated:** October 22, 2025

