#!/bin/bash

set -e

# Main installation process
main() {
    # Navigate to script directory
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    cd "$SCRIPT_DIR"

    # Check if build artifact exists
    if [ ! -f "dist/ai-console-agent" ]; then
        echo "Error: Build artifact not found at 'dist/ai-console-agent'. Please build the project first."
        exit 1
    fi

    echo "Starting installation of AI Console Agent..."

    # Delete existing binary in /usr/local/bin if it exists
    if [ -f "/usr/local/bin/ai" ]; then
        echo "Removing existing binary from /usr/local/bin..."
        if [ -w "/usr/local/bin" ]; then
            # If we have write permissions, remove directly
            rm /usr/local/bin/ai
        else
            # If we don't have write permissions, use sudo
            sudo rm /usr/local/bin/ai
        fi
    fi

    # Copy the new binary to /usr/local/bin
    echo "Installing AI Console Agent globally..."
    if [ -w "/usr/local/bin" ]; then
        # If we have write permissions, install directly
        cp dist/ai-console-agent /usr/local/bin/ai
    else
        # If we don't have write permissions, use sudo
        sudo cp dist/ai-console-agent /usr/local/bin/ai
    fi

    # Make the binary executable
    echo "Making the AI Console Agent executable..."
    if [ -w "/usr/local/bin" ]; then
        # If we have write permissions, make executable directly
        chmod +x /usr/local/bin/ai
    else
        # If we don't have write permissions, use sudo
        sudo chmod +x /usr/local/bin/ai
    fi

    echo "Installation complete! You can now use the 'ai' command from anywhere."
    echo "Note: When you run it for the first time, you'll be prompted for your API key."
}

# Run the installation
main
