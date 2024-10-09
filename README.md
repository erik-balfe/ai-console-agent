# AI Console Agent

AI Console Agent is an advanced command-line tool that uses artificial intelligence to interpret and execute complex commands in natural language. It acts as a skilled Linux system administrator and DevOps expert, capable of performing a wide range of tasks through command-line operations.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Safety and Limitations](#safety-and-limitations)
- [Development Status](#development-status)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)
- [Version](#version)

## Features

- Natural language processing for command interpretation
- Execution of system commands based on user input
- Intelligent file handling with automatic backups
- Non-interactive operation for most tasks
- User interaction for clarifications and confirmations
- Cautious command execution with step-by-step verification
- Use of a dedicated workspace for intermediate results
- Proactive information gathering about the system state
- Home directory caution for potentially risky operations
- Colorized console output for better readability

## Prerequisites

- Bun (latest version)
- Node.js (v14 or later)
- Git

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/ai-console-agent.git
   cd ai-console-agent
   ```

2. Install dependencies:

   ```
   bun install
   ```

3. Set up your OpenAI API key:
   Create a `.env` file in the project root and add your API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

## Usage

To run the AI Console Agent:

```
bun run src/index.ts "Your natural language command or question here"
```

Example:

```
bun run src/index.ts "Show me the disk usage of the current directory"
```

The agent will interpret your request, execute the necessary commands, and provide you with the results.

## Safety and Limitations

- The agent creates backups before modifying important files.
- It uses a dedicated workspace for intermediate results to avoid cluttering your system.
- The agent will ask for confirmation before performing potentially risky operations.
- It cannot perform actions that require interactive program usage (like text editors).
- While designed to be safe, use caution when giving it access to sensitive systems or data.

## Development Status

AI Console Agent is in early development. While functional, it may have bugs or limitations. Use it at your own risk and always verify important operations.

Upcoming features:

- Continuation of previous sessions and access to previous task context
- Compilation into a single, easy-to-distribute binary
- Enhanced learning and adaptation capabilities
- More advanced context-aware processing
- Comprehensive error handling and recovery system

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any problems or have any questions, please open an issue on the GitHub repository.

## Version

Current version: 0.1.0
