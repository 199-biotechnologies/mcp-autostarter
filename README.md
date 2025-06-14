# MCP Autostarter

An intelligent MCP server that restarts Claude's MCP handler process without disrupting the UI. Unlike traditional restart tools that kill the entire Claude Desktop application, this tool surgically restarts only the Node.js process handling MCP connections, allowing for seamless plugin reloading.

<a href="https://glama.ai/mcp/servers/@199-biotechnologies/mcp-autostarter">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@199-biotechnologies/mcp-autostarter/badge" alt="Autostarter MCP server" />
</a>

## Why MCP Autostarter?

When developing or installing MCP plugins, you need to restart Claude to load new configurations. Traditional approaches kill the entire Claude Desktop app, disrupting your workflow. MCP Autostarter is smarter - it:

1. **Identifies the MCP handler process** - Finds the specific Node.js process managing MCP connections
2. **Gracefully restarts it** - Sends SIGTERM first, then SIGKILL if needed
3. **Lets Claude auto-recover** - Claude Desktop detects the disconnection and automatically restarts the handler
4. **Keeps your UI intact** - No window closing, no lost context

## Installation

The easiest way is to let Claude Desktop install it automatically via npx. Just add it to your configuration!

## Configuration

Add to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "autostarter": {
      "command": "npx",
      "args": ["-y", "mcp-autostarter"],
      "env": {}
    }
  }
}
```

That's it! No manual installation needed - npx will handle everything automatically.

## Usage

Once configured, you can use these commands in Claude:

### Smart MCP Restart (Recommended)
```
"restart MCP"
```
This intelligently restarts only the MCP handler process, keeping Claude Desktop running.

### Full Claude Restart
```
"restart Claude"
```
This fully restarts Claude Desktop (use only if MCP restart fails).

### Check Status
```
"check MCP status"
```
Shows the current status of MCP handler and Claude Desktop processes.

## How It Works

1. **Process Detection**: Uses intelligent heuristics to find the Node.js process running MCP servers
2. **Graceful Shutdown**: Sends SIGTERM to allow clean shutdown
3. **Automatic Recovery**: Claude Desktop detects the disconnection and restarts the handler
4. **Verification**: Confirms the new process is running before reporting success

## Platform Support

- ✅ macOS
- ✅ Windows
- ✅ Linux

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode (watch)
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Comparison with mcp-server-restart

| Feature | mcp-autostarter | mcp-server-restart |
|---------|----------------|-------------------|
| Restarts MCP handler only | ✅ | ❌ |
| Keeps UI running | ✅ | ❌ |
| Cross-platform | ✅ | ❌ (Mac only) |
| Process detection | Intelligent | Basic |
| Graceful shutdown | ✅ | ❌ |

## License

MIT