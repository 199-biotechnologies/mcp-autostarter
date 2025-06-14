# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run TypeScript compiler in watch mode
- `npm run lint` - Run ESLint on TypeScript files
- `npm run typecheck` - Type check without emitting files
- `npm start` - Run the compiled application

### Testing and Publishing
- No test framework is currently configured
- Package is published to npm as `mcp-autostarter`

## Architecture Overview

This is an MCP (Model Context Protocol) server that manages the lifecycle of Claude Desktop's MCP handler process. The key insight is that it uses the MCP protocol itself to manage MCP connections.

### Core Components

**Entry Point** (`src/index.ts`):
- Creates MCP server with stdio transport
- Registers three tools: `restart_mcp`, `restart_claude`, `get_mcp_status`

**ProcessDetector** (`src/process-detector.ts`):
- Finds MCP handler Node.js processes using multiple heuristics (command line args, parent process)
- Locates Claude Desktop process by name
- Builds process trees to understand parent-child relationships

**ProcessManager** (`src/process-manager.ts`):
- Performs graceful process termination (SIGTERM → SIGKILL)
- Manages restart workflow with appropriate delays
- Platform-specific logic for launching Claude Desktop
- Monitors process restart success

### Key Design Decisions

1. **Surgical Restart**: Only restarts the MCP handler Node.js process, not all of Claude Desktop
2. **Auto-recovery**: Leverages Claude Desktop's built-in reconnection mechanism
3. **Cross-platform**: Handles macOS, Windows, and Linux process management differences
4. **Graceful Shutdown**: Always attempts clean shutdown before force killing

### Process Flow

1. User invokes tool through Claude Desktop
2. ProcessDetector finds the MCP handler process
3. ProcessManager terminates it gracefully
4. Claude Desktop detects disconnection and auto-restarts the handler
5. Tool verifies successful restart and reports back

The architecture is intentionally minimal and focused on solving the specific problem of MCP connection management without disrupting the user experience.