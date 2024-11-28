#!/bin/bash

set -e

# Function to get the actual path to bun
get_bun_path() {
    which bun || echo ""
}

# Store the bun path
BUN_PATH=$(get_bun_path)

if [ -z "$BUN_PATH" ]; then
    echo "Error: Bun is not installed. Please install Bun first:"
    echo "curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "Starting build and installation of AI Console Agent..."
echo "Using Bun from: $BUN_PATH"

# Function to check if the build was successful
check_build() {
    if [ ! -f "dist/ai-console-agent" ]; then
        echo "Error: Build failed - executable not found"
        exit 1
    fi
}

# Main installation process
main() {
    # Navigate to script directory
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    cd "$SCRIPT_DIR"

    # Install dependencies
    echo "Installing dependencies..."
    "$BUN_PATH" install

    # Build the project
    echo "Building project..."
    "$BUN_PATH" run build

    # Check if build was successful
    check_build

    # Install the executable
    echo "Installing AI Console Agent globally..."
    if [ -w "/usr/local/bin" ]; then
        # If we have write permissions, install directly
        cp dist/ai-console-agent /usr/local/bin/ai
        chmod +x /usr/local/bin/ai
    else
        # If we don't have write permissions, use sudo
        sudo cp dist/ai-console-agent /usr/local/bin/ai
        sudo chmod +x /usr/local/bin/ai
    fi

    echo "Installation complete! You can now use the 'ai' command from anywhere."
    echo "Note: When you run it for the first time, you'll be prompted for your API key."
}

# Run the installation
main
