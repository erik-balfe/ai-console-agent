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

- Natural language processing for command interpretation
- Execution of system commands based on user input
- Intelligent careful file handling with automatic backups
- Ask user for clarifications and confirmations
- Cautious command execution with step-by-step verification
- Use of a dedicated scratch space for storing intermediate results and working on files not affecting user files
- Proactive information gathering about the system configuration and user preferences
- Colorized console output for better readability
- Secure storage of OpenAI API key using system keychain
- Putting down user preferences for further more personalized interactions

### Planned features

- Storing all history of user queries and log of working on the tasks
- Considering all prev history when dealing with new tasks
- Support for viewing image files
- Support for web search for getting actual information
- More interactive mode. When agent can inform the user about current state of working on the task and understand time consumptions of different commands and warn about them and consider time of different approachen when planning tasks

## Installation

### Quick Install (Recommended)

You can install AI Console Agent by pasting this single command and running it in your terminal:

```bash
curl -sSL https://raw.githubusercontent.com/erik-balfe/ai-console-agent/master/install.sh | bash
```

This command will:

- Download the latest AI Console Agent binary
- Make it executable
- Install it in a directory in your PATH
- Guide you through setting up your OpenAI API key securely

After installation you can use AI Console Agent from anywhere like this:

```bash
ai-console-agent "Your natural language command or question here"
```

### Manual Installation

If you prefer to install manually:

1. Download the latest release:

   ```
   curl -L -o ai-console-agent https://github.com/erik-balfe/ai-console-agent/releases/latest/download/ai-console-agent
   ```

2. Make the file executable:

   ```
   chmod +x ai-console-agent
   ```

3. Move the file to a directory in your PATH:

   ```
   sudo mv ai-console-agent /usr/local/bin/
   ```

4. Run AI Console Agent:

   ```
   ai-console-agent "Your natural language command or question here"
   ```

   You will be prompted to enter your OpenAI API key on the first run.

5. Clone the repository:

   ```
   git clone https://github.com/yourusername/ai-console-agent.git
   cd ai-console-agent
   ```

6. Install dependencies:

   ```
   bun install
   ```

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

### Testing

To run some specific tests:

```sh
bun test --test-name-pattern testName --timeout 30000
```

To run all tests:

```sh
bun test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any problems or have any questions, please open an issue on the GitHub repository.

## Version

Current version: 0.2.5
