#!/bin/bash

set -e

echo "Installing AI Console Agent..."

# Download the latest release
curl -L -o ai-console-agent https://github.com/erik-balfe/ai-console-agent/releases/latest/download/ai-console-agent

# Make it executable
chmod +x ai-console-agent

# Move to /usr/local/bin with sudo (might require password)
sudo mv ai-console-agent /usr/local/bin/ai

echo "Installation complete! You can now use 'ai' command from anywhere."
echo "Note: When you run it for the first time, you'll be prompted for your API key."
