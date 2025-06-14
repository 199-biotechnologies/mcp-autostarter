import treeKill from 'tree-kill';
import { ProcessDetector, MCPProcess } from './process-detector.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';

const execAsync = promisify(exec);

export interface RestartResult {
  success: boolean;
  message: string;
  oldPid?: number;
  newPid?: number;
  error?: string;
}

export class ProcessManager {
  private detector = new ProcessDetector();
  private platform = platform();

  async restartMCPHandler(): Promise<RestartResult> {
    try {
      // Step 1: Find the MCP handler process
      const mcpProcess = await this.detector.findMCPHandlerProcess();
      
      if (!mcpProcess) {
        return {
          success: false,
          message: 'Could not find MCP handler process. It may not be running.',
          error: 'MCP_HANDLER_NOT_FOUND'
        };
      }

      const oldPid = mcpProcess.pid;
      console.log(`Found MCP handler process: PID ${oldPid}`);

      // Step 2: Gracefully terminate the process
      await this.gracefulKill(mcpProcess.pid);
      
      // Step 3: Wait a moment for Claude Desktop to detect the disconnection
      await this.delay(1000);

      // Step 4: Verify the process was terminated
      const stillRunning = await this.isProcessRunning(oldPid);
      if (stillRunning) {
        // Force kill if graceful didn't work
        await this.forceKill(oldPid);
        await this.delay(500);
      }

      // Step 5: Wait for Claude Desktop to restart the MCP handler
      const newProcess = await this.waitForMCPHandler(5000);
      
      if (newProcess) {
        return {
          success: true,
          message: 'MCP handler restarted successfully',
          oldPid,
          newPid: newProcess.pid
        };
      } else {
        return {
          success: false,
          message: 'MCP handler was terminated but did not restart automatically',
          oldPid,
          error: 'MCP_HANDLER_NOT_RESTARTED'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to restart MCP handler',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      };
    }
  }

  async restartClaudeDesktop(): Promise<RestartResult> {
    try {
      const claudeProcess = await this.detector.findClaudeDesktopProcess();
      
      if (!claudeProcess) {
        return {
          success: false,
          message: 'Claude Desktop is not running',
          error: 'CLAUDE_NOT_RUNNING'
        };
      }

      const oldPid = claudeProcess.pid;
      
      // Kill Claude Desktop
      await this.gracefulKill(claudeProcess.pid);
      await this.delay(2000);

      // Restart Claude Desktop based on platform
      await this.launchClaudeDesktop();
      
      // Wait for it to start
      const newProcess = await this.waitForClaudeDesktop(10000);
      
      if (newProcess) {
        return {
          success: true,
          message: 'Claude Desktop restarted successfully',
          oldPid,
          newPid: newProcess.pid
        };
      } else {
        return {
          success: false,
          message: 'Failed to restart Claude Desktop',
          error: 'CLAUDE_RESTART_FAILED'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error restarting Claude Desktop',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      };
    }
  }

  private async gracefulKill(pid: number): Promise<void> {
    return new Promise((resolve, reject) => {
      treeKill(pid, 'SIGTERM', (err: Error | undefined) => {
        if (err && err.message !== 'No such process') {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private async forceKill(pid: number): Promise<void> {
    return new Promise((resolve, reject) => {
      treeKill(pid, 'SIGKILL', (err: Error | undefined) => {
        if (err && err.message !== 'No such process') {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private async isProcessRunning(pid: number): Promise<boolean> {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  private async waitForMCPHandler(timeout: number): Promise<MCPProcess | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const process = await this.detector.findMCPHandlerProcess();
      if (process) {
        return process;
      }
      await this.delay(500);
    }
    
    return null;
  }

  private async waitForClaudeDesktop(timeout: number): Promise<MCPProcess | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const process = await this.detector.findClaudeDesktopProcess();
      if (process) {
        return process;
      }
      await this.delay(500);
    }
    
    return null;
  }

  private async launchClaudeDesktop(): Promise<void> {
    switch (this.platform) {
      case 'darwin':
        await execAsync('open -a "Claude"');
        break;
      case 'win32':
        await execAsync('start "" "Claude.exe"');
        break;
      case 'linux':
        await execAsync('claude-desktop &');
        break;
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}