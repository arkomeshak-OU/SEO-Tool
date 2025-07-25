# Use Node.js base image with Debian
FROM node:20-slim

# Install system dependencies and Chrome
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    curl unzip gnupg ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 \
    libatk1.0-0 libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 libnss3 libx11-xcb1 libxcomposite1 libxdamage1 \
    libxrandr2 xdg-utils wget --no-install-recommends && \
    wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    apt install -y ./google-chrome-stable_current_amd64.deb && \
    rm google-chrome-stable_current_amd64.deb && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set environment variables for Chrome path
ENV CHROME_PATH=/usr/bin/google-chrome
ENV LIGHTHOUSE_CHROMIUM_PATH=/usr/bin/google-chrome

# Install Lighthouse CLI
RUN npm install -g lighthouse

# Set working directory
WORKDIR /app

# Copy project files into container
COPY project/ .

# Install Python dependencies
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Expose port
EXPOSE 10000

# Start the Flask app with Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:10000", "app:app"]
