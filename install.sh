#!/bin/bash

set -e

install_tmux() {
    echo "tmux is not installed. Attempting to install..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install tmux
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f "/etc/debian_version" ]; then
            sudo apt-get update && sudo apt-get install -y tmux
        elif [ -f "/etc/fedora-release" ]; then
            sudo dnf install -y tmux
        else
            echo "Unable to install tmux automatically  . Please install tmux manually and run this script again."
            exit 1
        fi
    else
        echo "Unsupported operating system. Please install tmux manually and run this script again."
        exit 1
    fi
}

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    install_tmux
fi

set -e

# Download the latest release
echo "Downloading the latest AI Console Agent..."
curl -L -o ai-console-agent https://github.com/erik-balfe/ai-console-agent/releases/latest/download/ai-console-agent

# Make the binary executable
chmod +x ai-console-agent

# Detect the system and default shell
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
else
    OS="Linux"
fi

SHELL_CONFIG_FILE=""
if [[ "$SHELL" == *"bash"* ]]; then
    SHELL_CONFIG_FILE="$HOME/.bashrc"
elif [[ "$SHELL" == *"zsh"* ]]; then
    SHELL_CONFIG_FILE="$HOME/.zshrc"
else
    echo "Unsupported shell. Please add the installation directory to your PATH manually."
    exit 1
fi

# Move the binary to a directory in PATH
INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"
mv ai-console-agent "$INSTALL_DIR/"

# Add the installation directory to PATH if not already present
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo "export PATH=\$PATH:$INSTALL_DIR" >> "$SHELL_CONFIG_FILE"
    export PATH=$PATH:$INSTALL_DIR
fi

echo "AI Console Agent has been installed successfully!"
echo "Please restart your terminal or run 'source $SHELL_CONFIG_FILE' to use the agent."
echo "You can now run 'ai-console-agent' from anywhere in your terminal."

# Prompt for OpenAI API key
read -p "Enter your OpenAI API key: " OPENAI_API_KEY
echo "export OPENAI_API_KEY=$OPENAI_API_KEY" >> "$SHELL_CONFIG_FILE"

echo "OpenAI API key has been added to your shell configuration."
echo "Installation complete! Enjoy using AI Console Agent!"
