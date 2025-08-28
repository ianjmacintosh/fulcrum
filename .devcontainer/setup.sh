#!/bin/bash
set -e

# Fix permissions
sudo chown -R node:node /workspaces/fulcrum

# Install dependencies
npm ci

# Any other setup commands...
echo "Dev container setup complete!"