# ─────────────────────────────────────────────────────────────
# GovMatch AI — Python NLP Service (Flask + SentenceTransformers)
# Port 5002
# ─────────────────────────────────────────────────────────────

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed by spaCy, numpy, and health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy model
RUN python -m spacy download en_core_web_sm

# Copy application files
COPY . .

# Expose NLP service port
EXPOSE 5002

# Run the Flask NLP service
CMD ["python", "semantic_search.py"]
