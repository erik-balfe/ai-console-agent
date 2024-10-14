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
- Intelligent file handling with automatic backups
- Non-interactive operation for most tasks
- User interaction for clarifications and confirmations
- Cautious command execution with step-by-step verification
- Use of a dedicated workspace for intermediate results
- Proactive information gathering about the system state
- Home directory caution for potentially risky operations
- Colorized console output for better readability

## Installation

### Quick Install (Recommended)

You can install AI Console Agent with a single command:

```bash
curl -sSL https://raw.githubusercontent.com/erik-balfe/ai-console-agent/master/install.sh | bash
```

This command will:

- Download the latest AI Console Agent binary
- Make it executable
- Install it in a directory in your PATH
- Set up your OpenAI API key

After installation, restart your terminal or run `source ~/.bashrc` (or `~/.zshrc` for Zsh users), then you can use AI Console Agent from anywhere:

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

4. Set up your OpenAI API key:

   ```
   echo "export OPENAI_API_KEY=your_api_key_here" >> ~/.bashrc
   source ~/.bashrc
   ```

5. Run AI Console Agent:

   ```
   ai-console-agent "Your natural language command or question here"
   ```

   Example:

   ```
   ai-console-agent "Show me the disk usage of the current directory"
   ```

6. Clone the repository:

   ```
   git clone https://github.com/yourusername/ai-console-agent.git
   cd ai-console-agent
   ```

7. Install dependencies:

   ```
   bun install
   ```

8. Set up your OpenAI API key:
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

## Development

### Prerequisites

- Bun. To install Bun, follow the instructions at https://bun.sh/.
- Git

### Compilation and Distribution

### Compilation Process

#### Building on local machine

To compile the AI Console Agent into a standalone executable with source maps, follow these steps:

1. Ensure Bun is installed. If not, install it using:

   ```
   curl -fsSL https://bun.sh/install | bash
   ```

2. Run the build script:

   ```
   bun run build
   ```

3. Upon successful compilation, you'll see a message similar to:

   ```
   Build completed successfully. Executable: /path/to/ai-console-agent/dist/ai-console-agent
   ```

The compiled executable will be created in the `dist` directory as `ai-console-agent`.

#### Building in Docker

> **Note**: Building in Docker is currently not working and is a work in progress. The following steps are provided for reference but may not function as expected. We are actively working on resolving this issue.

1. Build the Docker image:

   ```
   docker build -t ai-console-agent .
   ```

   This command builds a Docker image based on your Dockerfile and tags it with the name "ai-console-agent".

2. Once the image is built, you can run a container from this image to build your application:

   ```sh
   docker run --rm -v $(pwd)/dist:/app/dist ai-console-agent
   ```

   ```bash
   docker run --rm -v $pwd/dist:/app/dist ai-console-agent
   ```

3. After the container finishes running, you should find the built application in your local `dist` directory.

4. To test the built application, you can run:
   ```
   ./dist/ai-console-agent "Your test question here"
   ```
   Remember to set your OPENAI_API_KEY environment variable before running this command.

### Running the Compiled Executable

After successful compilation, run the AI Console Agent using:

```
./dist/ai-console-agent "Your command here"
```

Remember to use the double quotes around your command to avoid issues with special characters in you message.

This executable includes all necessary dependencies and can be distributed as a standalone program.

### Release Process for Developers

> **Note**: The automatic release process for this app via GitHub Actions is currently suspended due to critical errors in the build process of Bun. The executable produced by the GitHub Actions workflow contains a critical error that prevents the application from functioning correctly. As a result, only manual building is working at the moment. The release process described below is temporarily on hold until these issues are resolved.

To create a new release:

1. Ensure all changes are committed and pushed to the main branch.

2. Update the version number in `package.json`.

3. Create a new tag with the version number:

   ```
   git tag v1.0.0  # Replace with your version number
   ```

4. Push the tag to GitHub:

   ```
   git push origin v1.0.0  # Replace with your version number
   ```

5. The GitHub Actions workflow will automatically:

   - Build the project
   - Create a new release
   - Attach the compiled executable to the release

6. Once complete, you can find the new release on the GitHub repository's releases page.

### Troubleshooting Compilation

Compilation is done using Bun bundler that allows compiling TypeScript code into one executable file.
Read about it here: https://bun.sh/docs/bundler/executables

If you encounter errors related to missing packages during compilation, follow these steps:

1. Identify the missing packages from the error messages. For example these were such problem packages (currently already included in dev deps, so theyre not a problem anymore):

   - pg
   - @xenova/transformers
   - pgvector

2. Install these packages as dev dependencies:

   ```
   bun add -d packageName1 packageName2 ...
   ```

   For example:

   ```
   bun add -d pg @xenova/transformers pgvector
   ```

3. Look that your `package.json` is updated to include these as dev dependencies:

   ```json
   {
     "devDependencies": {
       "@types/bun": "latest",
       "@xenova/transformers": "^2.17.2",
       "pg": "^8.13.0",
       "pgvector": "^0.2.0"
     },
     "dependencies": {
       "chalk": "^5.3.0",
       "dotenv": "^16.0.0",
       "llamaindex": "^0.6.18"
     }
   }
   ```

4. Run the build process again:
   ```
   bun run build
   ```

Note: This issue may occur if there are changes in the `llamaindex` package or its dependencies. Always check for updates and be prepared to add new dev dependencies as needed.

Currently adding such packages as dev deps resolves the issue with building project in a single executable.
The problem happens because of dynamic imports in deps of current project, so only adding them as dev deps helps.

### Development run

For development and testing purposes, you can run the project directly without compilation:

```
bun run src/index.ts "Your natural language command or question here"
```

This method works fine for development without requiring the additional setup needed for compilation.

### Keeping Dependencies Updated

To ensure the project remains up-to-date:

1. Periodically update the project dependencies:
   ```
   bun update
   ```
2. After updating, perform a fresh compilation process to ensure compatibility with the latest versions.
3. Test the newly compiled executable thoroughly before distribution.

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

Current version: 0.2.3
