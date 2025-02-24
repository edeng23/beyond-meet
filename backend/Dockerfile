FROM python:3.11-slim

WORKDIR /usr/src/app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Copy credentials file
COPY credentials.json .

# Create necessary directories
RUN mkdir -p app/api app/models app/services

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run the application with hot reload in development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"] 