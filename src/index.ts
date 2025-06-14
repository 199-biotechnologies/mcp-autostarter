#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ProcessManager } from './process-manager.js';
import { ProcessDetector } from './process-detector.js';

const server = new Server(
  {
    name: 'mcp-autostarter',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

const processManager = new ProcessManager();
const processDetector = new ProcessDetector();

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'restart_mcp',
        description: 'Intelligently restarts only the MCP handler process without disrupting Claude Desktop UI',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'restart_claude',
        description: 'Fully restarts Claude Desktop application (use only if MCP restart fails)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_mcp_status',
        description: 'Check if MCP handler and Claude Desktop processes are running',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case 'restart_mcp': {
      try {
        console.error('Restarting MCP handler process...');
        const result = await processManager.restartMCPHandler();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to restart MCP handler: ${error}`
        );
      }
    }

    case 'restart_claude': {
      try {
        console.error('Restarting Claude Desktop...');
        const result = await processManager.restartClaudeDesktop();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to restart Claude Desktop: ${error}`
        );
      }
    }

    case 'get_mcp_status': {
      try {
        const mcpProcess = await processDetector.findMCPHandlerProcess();
        const claudeProcess = await processDetector.findClaudeDesktopProcess();
        
        const status = {
          mcp_handler: mcpProcess ? {
            running: true,
            pid: mcpProcess.pid,
            name: mcpProcess.name,
            cmd: mcpProcess.cmd,
          } : {
            running: false,
          },
          claude_desktop: claudeProcess ? {
            running: true,
            pid: claudeProcess.pid,
            name: claudeProcess.name,
          } : {
            running: false,
          },
          timestamp: new Date().toISOString(),
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to get status: ${error}`
        );
      }
    }

    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${request.params.name}`
      );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Autostarter server running on stdio');
}

main().catch(console.error);