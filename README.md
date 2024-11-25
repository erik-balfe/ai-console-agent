# AI Console Agent

AI Console Agent is an advanced command-line tool that uses artificial intelligence to interpret and execute complex commands in natural language. It acts as a skilled Linux system administrator and DevOps expert, capable of performing a wide range of tasks through command-line operations.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Compilation and Distribution](#compilation-and-distribution)
- [Safety and Limitations](#safety-and-limitations)
- [Development Status](#development-status)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)
- [Version](#version)

## Features

- Proactive working on user task
- Intelligent careful file handling with automatic backups
- Cautious command execution with user confirmation for important and possibly irreversible commands
- Use of a dedicated scratch space for storing intermediate results and working on files not affecting user files
- Various LLM models support (Claude, GPT, Llama)
- Secure storage of API keys
- Memory allowing to recall anything from previous dialogues

### Planned features

- Support for image interpreting (files and provided in chat)
- Support for web search.
- More interactive mode. When agent can inform the user about current state of working on the task and understand time consumptions of different commands and warn about them and consider time of different approachen when planning tasks

## Installation

### For Users

#### Option 1: Quick Install (Recommended)

```bash
curl -sSL https://raw.githubusercontent.com/erik-balfe/ai-console-agent/master/install.sh | bash
```

This will install the AI Console Agent globally as the `ai` command. You'll need to enter your sudo password during installation.

#### Option 2: Manual Installation

If you prefer to see what's happening during installation:

1. Download the latest release:

   ```bash
   curl -L -o ai-console-agent https://github.com/erik-balfe/ai-console-agent/releases/latest/download/ai-console-agent
   ```

2. Make it executable:

   ```bash
   chmod +x ai-console-agent
   ```

3. Install globally (requires sudo):
   ```bash
   sudo mv ai-console-agent /usr/local/bin/ai
   ```

After installation, you can use the command `ai` from anywhere in your terminal. On first run, you'll be prompted to enter your OpenAI API key.

## Usage

To run the AI Console Agent:

```
ai-console-agent "Show me the disk usage of the current directory"
```

The agent will interpret your request, execute the necessary commands, and provide you with the results.

For the first run you will be prompted to enter your OpenAI API key. After that, the key will be stored securely using your system's encrypted storage.

If you want to reset the key, you can use the `--reset-key` argument:

```
ai-console-agent --reset-key
```

After that you will be prompted to enter your OpenAI API key again.

To see usage information and all available options in console:

```
ai-console-agent --help
```

## Development

### Prerequisites

- Bun. To install Bun, follow the instructions at https://bun.sh/.
- Git

### Installation

1. Install Bun (if not already installed):

   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. Clone the repository:

   ```bash
   git clone https://github.com/erik-balfe/ai-console-agent.git
   cd ai-console-agent
   ```

3. Install dependencies:

   ```bash
   bun install
   ```

4. Run in development mode:
   ```bash
   bun run ./src/index.ts
   ```

### API Key Management

The application now securely stores the OpenAI API key using the system's keychain. On first run, or if no valid API key is found, you will be prompted to enter your API key. The key is then securely stored for future use.

## Safety and Limitations

- The agent creates backups before modifying important files.
- It uses a dedicated workspace for intermediate results to avoid cluttering your system.
- The agent will ask for confirmation before performing potentially risky operations.
- It cannot perform actions that require interactive program usage (like text editors).
- While designed to be safe, use caution when giving it access to sensitive systems or data.

## Development Status

AI Console Agent is in early development. While functional, it may have bugs or limitations. Use it at your own risk and always verify important operations.

### Database Documentation

For detailed information about the database structure and data flow, please refer to [Database Schema Documentation](docs/database.md). This document outlines the tables, relationships, and data management strategies used in the application.

### Current Limitations and Known Issues

1. **Input Handling**:

   - Multiline user inputs are not currently supported due to limitations in the inquirer library

2. **Interactive Commands**:

   - Interactive commands (like 'git rebase -i') are not supported to be run by ai-console-agent and may cause the program to hang
   - The agent is instructed to avoid such commands and complete tasks in non-interactive mode

3. **Installation and SSH Usage**:

   - The program can be installed and run on any system that supports Bun runtime
   - Terminal interactions (like entering API keys) require a local terminal with full TTY support
   - When accessing the program through SSH, terminal-based interactions will not function properly due to SSH terminal limitations
   - For remote systems, install and configure the program directly on the target machine rather than accessing it through SSH

4. **System Integration**:
   - Sudo commands don't function properly
   - Planned fix: Implement secure password prompting without storing credentials

### Testing

To run specific tests:

```sh
bun test --test-name-pattern testName --timeout 30000
```

### Future Development Plans

1. **Backend Architecture**:

   - Transform the application into a backend service
   - Support for HTTP requests with structured response format
   - Optional plugin mode with websocket support for external program integration
   - Local deployment capability with port-based communication

2. **Visualization and Documentation**:

   - Mermaid diagram integration for system architecture and workflow visualization
   - Interactive diagrams for real-time system monitoring and documentation

3. **Frontend Development**:

   - Web-based UI implementation
   - Dynamic UI generation using AI
   - Flexible, non-hardcoded layout system
   - Real-time interaction with backend services

4. **User Interface Improvements**:

   - Development of an intuitive, responsive UI
   - Support for both local and web-based interfaces
   - AI-driven dynamic control element generation
   - Enhanced visualization of command execution and results
   - Advanced cost tracking and reporting.

5. **Advanced Command Execution System** [DONE]:

   - Enhanced command execution capabilities:
     • Support for long-running processes with progress monitoring
     • Ability to interrupt and manage running commands
     • Non-blocking asynchronous command execution
   - Improved process control and monitoring:
     • Real-time output capture from running commands
     • Intelligent handling of command timeouts and interrupts
     • Multi-command parallel execution support

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any problems or have any questions, please open an issue on the GitHub repository.

## Version

Current version: 0.2.12
