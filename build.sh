#!/usr/bin/env bash
# exit on error
set -o errexit

# Build the frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Install backend dependencies
echo "Installing backend dependencies..."
pip install -r backend/requirements.txt
