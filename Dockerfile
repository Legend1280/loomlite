# LoomLite Production Dockerfile
# Optimized for Railway deployment with ChromaDB and sentence-transformers

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for better caching)
COPY requirements.txt .

# Install Python dependencies
# Use --no-cache-dir to reduce image size
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download the MiniLM model (saves time on first run)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy application code
COPY . .

# Copy and set up startup script
COPY startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh

# Create directory for ChromaDB persistence
RUN mkdir -p /app/chroma_db

# Expose port (Railway will override this with $PORT)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/tree || exit 1

# Run the application with migration
CMD ["/app/startup.sh"]
