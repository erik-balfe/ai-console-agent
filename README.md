# AI-console-assistant

AI-console-assistant is a powerful command-line tool that uses artificial intelligence to interpret and execute complex commands in natural language.

## Features

- Natural language processing for command interpretation
- Supports a wide range of system commands, translating natural language into executable commands
- Safe execution with user confirmation before running any system commands
- Extensible architecture for adding new capabilities and command support

## Table of Contents

- [Quick Start (For Users)](#quick-start-for-users)
- [Developer Guide](#developer-guide)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)
- [Version](#version)

## Quick Start (For Users)

### Prerequisites

- A Unix-like operating system (Linux, macOS)

### Installation

// currently does not work as no releases are made.

1. Download the latest `ai` executable from the [releases page](link-to-your-releases-page).
2. Make the file executable:
   ```sh
   chmod +x ai
   ```
3. Move the executable to a directory in your PATH:
   ```sh
   sudo mv ai /usr/local/bin/
   ```

### Configuration

Set your OpenAI API key as an environment variable:

```sh
export OPENAI_API_KEY=your_api_key_here
```

To make this permanent, add the above line to your shell configuration file (e.g., `~/.bashrc`, `~/.zshrc`, etc.).

## Developer Guide

### Prerequisites

- Bun (latest version)
- Node.js (v14 or later)
- Git

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/yourusername/ai-console-agent.git
   cd ai-console-agent
   ```

2. Install dependencies:
   ```sh
   bun install
   ```

### Configuration

For development, you can use a `.env` file in the project root:

1. Create a `.env` file in the project root directory
2. Add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

### Compilation

To compile the project into a standalone executable:

// currently does not work

```sh
bun build ./src/index.ts --compile --outfile ai
```

### Development

For development and debugging, run the project directly with Bun:

```sh
bun run src/index.ts [your command here]
```

## Usage

Run the AI assistant from anywhere in your terminal:

// currently does not work as compilation is in WIP and thun can't be called this way

```sh
ai [your prompt or question here]
```

For example:

```sh
ai show all running docker containers
```

## Troubleshooting

- If you encounter permission issues when running the executable, try:
  ```sh
  chmod +x ai
  ```
- Ensure your OpenAI API key is properly set as an environment variable in your system.
- For developers: If using a `.env` file, make sure it's in the correct location and formatted properly.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).

## Support

If you encounter any problems or have any questions, please open an issue on the GitHub repository.

## Version

Current version: 0.1.0.
It is in early development and currently might not work as expected.
