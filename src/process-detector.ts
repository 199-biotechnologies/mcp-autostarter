import findProcess from 'find-process';
import psList from 'ps-list';
import { platform } from 'os';

export interface MCPProcess {
  pid: number;
  name: string;
  cmd: string;
  ppid?: number;
}

export class ProcessDetector {
  private platform = platform();

  async findMCPHandlerProcess(): Promise<MCPProcess | null> {
    try {
      const processes = await psList();
      
      // Look for Node.js processes that are running MCP-related code
      const mcpCandidates = processes.filter(proc => {
        const cmd = proc.cmd || '';
        const name = proc.name || '';
        
        // Check for Node.js processes running MCP servers
        return (
          (name.includes('node') || name.includes('Node')) &&
          (cmd.includes('mcp') || 
           cmd.includes('modelcontextprotocol') ||
           cmd.includes('claude-desktop-internal') ||
           cmd.includes('@anthropic'))
        );
      });

      // If we have multiple candidates, try to identify the main MCP handler
      if (mcpCandidates.length > 0) {
        // Prefer processes that look like the main MCP handler
        const mainHandler = mcpCandidates.find(proc => 
          proc.cmd?.includes('mcp-server') || 
          proc.cmd?.includes('mcp-handler') ||
          proc.cmd?.includes('desktop-mcp')
        );

        const selected = mainHandler || mcpCandidates[0];
        
        return {
          pid: selected.pid,
          name: selected.name,
          cmd: selected.cmd || '',
          ppid: selected.ppid
        };
      }

      // Fallback: look for processes by port or specific patterns
      const nodeProcesses = await findProcess('name', 'node') as any[];
      
      for (const proc of nodeProcesses) {
        if (proc.cmd?.includes('mcp') || proc.cmd?.includes('modelcontextprotocol')) {
          return {
            pid: proc.pid,
            name: proc.name,
            cmd: proc.cmd
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding MCP handler process:', error);
      return null;
    }
  }

  async findClaudeDesktopProcess(): Promise<MCPProcess | null> {
    try {
      const processes = await psList();
      
      const claude = processes.find(proc => {
        const name = proc.name.toLowerCase();
        return name.includes('claude') && 
               (name.includes('desktop') || name.includes('app'));
      });

      if (claude) {
        return {
          pid: claude.pid,
          name: claude.name,
          cmd: claude.cmd || '',
          ppid: claude.ppid
        };
      }

      return null;
    } catch (error) {
      console.error('Error finding Claude Desktop process:', error);
      return null;
    }
  }

  async getProcessTree(pid: number): Promise<MCPProcess[]> {
    try {
      const processes = await psList();
      const tree: MCPProcess[] = [];
      
      const findChildren = (parentPid: number) => {
        const children = processes.filter(p => p.ppid === parentPid);
        for (const child of children) {
          tree.push({
            pid: child.pid,
            name: child.name,
            cmd: child.cmd || '',
            ppid: child.ppid
          });
          findChildren(child.pid);
        }
      };
      
      findChildren(pid);
      return tree;
    } catch (error) {
      console.error('Error getting process tree:', error);
      return [];
    }
  }
}