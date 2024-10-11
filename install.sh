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
# curl -L -o ai-console-agent https://github.com/erik-balfe/ai-console-agent/releases/latest/download/ai-console-agent

# Make the binary executable
chmod +x ai-console-agent

# Detect the system
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
else
    echo "Unsupported operating system. This script is designed for macOS and Linux."
    exit 1
fi

# Detect the shell and set the appropriate config file
if [ -n "$ZSH_VERSION" ]; then
    SHELL_NAME="zsh"
    SHELL_CONFIG_FILE="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_NAME="bash"
    SHELL_CONFIG_FILE="$HOME/.bashrc"
elif [ -n "$FISH_VERSION" ]; then
    SHELL_NAME="fish"
    SHELL_CONFIG_FILE="$HOME/.config/fish/config.fish"
else
    echo "Unsupported shell. Please add the installation directory to your PATH manually."
    SHELL_NAME="unknown"
    SHELL_CONFIG_FILE=""
fi

# Move the binary to a directory in PATH
INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"
mv ai-console-agent "$INSTALL_DIR/"

# Add the installation directory to PATH if not already present
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    if [ "$SHELL_NAME" = "fish" ]; then
        echo "set -x PATH \$PATH $INSTALL_DIR" >> "$SHELL_CONFIG_FILE"
    elif [ -n "$SHELL_CONFIG_FILE" ]; then
        echo "export PATH=\$PATH:$INSTALL_DIR" >> "$SHELL_CONFIG_FILE"
    fi
    export PATH=$PATH:$INSTALL_DIR
fi

echo "AI Console Agent has been installed successfully!"

if [ -n "$SHELL_CONFIG_FILE" ]; then
    echo "Please restart your terminal or run the following command to use the agent:"
    if [ "$SHELL_NAME" = "fish" ]; then
        echo "source $SHELL_CONFIG_FILE"
    else
        echo "source $SHELL_CONFIG_FILE"
    fi
else
    echo "Please add $INSTALL_DIR to your PATH manually to use the agent."
fi

echo "You can now run 'ai-console-agent' from anywhere in your terminal."

# Prompt for OpenAI API key
read -p "Enter your OpenAI API key: " OPENAI_API_KEY

if [ -n "$SHELL_CONFIG_FILE" ]; then
    if [ "$SHELL_NAME" = "fish" ]; then
        echo "set -x OPENAI_API_KEY $OPENAI_API_KEY" >> "$SHELL_CONFIG_FILE"
    else
        echo "export OPENAI_API_KEY=$OPENAI_API_KEY" >> "$SHELL_CONFIG_FILE"
    fi
    echo "OpenAI API key has been added to your shell configuration."
else
    echo "Please set the OPENAI_API_KEY environment variable manually:"
    echo "export OPENAI_API_KEY=$OPENAI_API_KEY"
fi

echo "Installation complete! Enjoy using AI Console Agent!"
