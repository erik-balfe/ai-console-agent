# Database Schema Overview for AI Console Agent

## Introduction

The AI Console Agent utilizes a SQLite database to track user interactions, agent responses, and tool usages. This document details the database structure, data flow, and entity relationships integral to the application.

## Tables

### 1. Conversations Table

- **Purpose**: Stores user conversations, enabling the tracking of user queries and feedback.
- **Fields**:# Database Schema Overview for AI Console Agent

## Introduction

The AI Console Agent uses a SQLite database to track user interactions, agent responses, and tool interactions. This document outlines the database structure, the data flow within the application, and the relationships between data entities.

## Tables

### 1. Conversations Table

- **Purpose**: Stores each user conversation to track user queries and feedback.
- **Fields**:
  - `id`: `INTEGER PRIMARY KEY AUTOINCREMENT` - Unique identifier for the conversation.
  - `user_query`: `TEXT NOT NULL` - The query or command entered by the user.
  - `timestamp`: `BIGINT NOT NULL` - The time when the conversation started (milliseconds since epoch).
  - `user_feedback`: `TEXT` - Optional feedback captured from the user after the interaction.
  - `total_time`: `INTEGER` - Total duration of the conversation in milliseconds.

---

### 2. Agent Steps Table

- **Purpose**: Logs each step taken by the agent during a conversation, detailing responses and execution metrics.
- **Fields**:
  - `id`: `INTEGER PRIMARY KEY AUTOINCREMENT` - Unique identifier for each agent step.
  - `conversation_id`: `INTEGER NOT NULL` - Foreign key linking to the `conversations` table.
  - `step_number`: `INTEGER NOT NULL` - The order of this step within its conversation.
  - `content`: `TEXT NOT NULL` - The content of the agent's response.
  - `timestamp`: `BIGINT NOT NULL` - Execution time of the step (milliseconds since epoch).
  - `execution_time`: `INTEGER NOT NULL` - Duration taken for the agent to generate this response (milliseconds).
  - `role`: `TEXT NOT NULL` - The entity's role (e.g., AGENT).

---

### 3. Tool Uses Table

- **Purpose**: Records the usage of tools by the agent, tracking command executions and their results.
- **Fields**:
  - `id`: `INTEGER PRIMARY KEY AUTOINCREMENT` - Unique identifier for each tool usage entry.
  - `conversation_id`: `INTEGER NOT NULL` - Foreign key linking back to the `conversations` table, indicating which conversation this tool usage is part of.
  - `step_id`: `INTEGER NOT NULL` - Foreign key linking to the `agent_steps` table, indicating which agent step the tool call is part of.
  - `tool_name`: `TEXT NOT NULL` - Name of the tool used (e.g., "executeCommand").
  - `input_params`: `TEXT NOT NULL` - Parameters passed to the tool, typically saved as a JSON string.
  - `output`: `TEXT NOT NULL` - The result returned from the tool, captured as a JSON string.
  - `timestamp`: `BIGINT NOT NULL` - Time of tool usage (milliseconds since epoch).
  - `execution_time`: `INTEGER NOT NULL` - Duration taken for the tool to execute (milliseconds).

---

## Data Flow

1. **Initialization**:
   When the application starts, the database initializes and creates necessary tables if they do not exist.

2. **Saving Conversations**:

   - Each user query results in a new entry in the `conversations` table, logging the `user_query` and timestamp.

3. **Logging Agent Steps**:

   - As the agent processes tasks, it records its responses in the `agent_steps` table. Each entry captures the `conversation_id`, `step_number`, `content`, and execution metrics.

4. **Tool Usage Tracking**:
   - During tool executions (e.g., executing commands), entries are added to the `tool_uses` table with the `conversation_id`, `step_id`, and more to maintain context.

---

## Relationships

- **Conversations** to **Agent Steps**: Linked through `conversation_id`, allowing for a comprehensive view of all steps taken in a specific conversation.
- **Agent Steps** to **Tool Uses**: The `step_id` allows for detailed tracking of tool usage in relation to agent responses.

## Conclusion

This document provides a comprehensive overview of the database schema in the AI Console Agent, including detailed descriptions of the tables, their fields, data flow, and interconnections. This should serve as a reference for developers and facilitate effective data management practices within the application.

  - `id`: `INTEGER PRIMARY KEY AUTOINCREMENT` - Unique identifier for each conversation.
  - `user_query`: `TEXT NOT NULL` - The command or query submitted by the user.
  - `timestamp`: `BIGINT NOT NULL` - The conversation start time (in milliseconds since epoch).
  - `user_feedback`: `TEXT` - User feedback related to this conversation (optional).
  - `total_time`: `INTEGER` - Total duration of the conversation (in milliseconds).

---

### 2. Agent Steps Table

- **Purpose**: Logs responses and actions taken by the agent during conversations.
- **Fields**:
  - `id`: `INTEGER PRIMARY KEY AUTOINCREMENT` - Unique identifier for each agent step.
  - `conversation_id`: `INTEGER NOT NULL` - Foreign key linking to the corresponding entry in the `conversations` table.
  - `step_number`: `INTEGER NOT NULL` - Order number of the step within its conversation.
  - `content`: `TEXT NOT NULL` - The content of the agent's generated response.
  - `timestamp`: `BIGINT NOT NULL` - When the step was executed (in milliseconds since epoch).
  - `execution_time`: `INTEGER NOT NULL` - Time taken for the agent to produce this step's response (in milliseconds).
  - `role`: `TEXT NOT NULL` - Indicates the entity's role, typically “AGENT”.

---

### 3. Tool Uses Table

- **Purpose**: Records interactions with tools invoked by the agent.
- **Fields**:
  - `id`: `INTEGER PRIMARY KEY AUTOINCREMENT` - Unique identifier for the tool usage record.
  - `conversation_id`: `INTEGER NOT NULL` - Links to the `conversations` table.
  - `step_id`: `INTEGER NOT NULL` - Links to the `agent_steps` table, indicating the agent step during which the tool was used.
  - `tool_name`: `TEXT NOT NULL` - The name of the tool executed (e.g., "executeCommand").
  - `input_params`: `TEXT NOT NULL` - Parameters provided to the tool, formatted as a JSON string.
  - `output`: `TEXT NOT NULL` - Result returned by the tool, also formatted as a JSON string.
  - `timestamp`: `BIGINT NOT NULL` - Time of tool usage (in milliseconds since epoch).
  - `execution_time`: `INTEGER NOT NULL` - Time taken for the tool to execute (in milliseconds).

---

## Data Flow

1. **Initialization**:

   - Upon application startup, the database initializes and constructs necessary tables if they do not already exist.

2. **Capturing Conversations**:

   - Each user query generates a new entry in the `conversations` table, storing the `user_query` and associated timestamp.

3. **Logging Agent Interactions**:

   - As the agent responds to user queries, each response is recorded in the `agent_steps` table, capturing critical execution metrics.

4. **Tracking Tool Usages**:
   - When tools are executed, corresponding entries populate the `tool_uses` table, maintaining references to both the initiating conversation and the related agent step.

---

## Relationships

- **Conversations ↔ Agent Steps**: Linked by `conversation_id`, enabling tracking of all steps associated with a particular conversation.
- **Agent Steps ↔ Tool Uses**: Connected through `step_id`, detailing which steps involved tool operations.

## Conclusion

This document serves as a guide to the database schema within the AI Console Agent. By detailing the purpose and relationships of the various tables, it offers clarity on data management and retrieval strategies essential for maintaining an effective conversational AI environment.
