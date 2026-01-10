/**
 * TASK-041: Claude Flow CLI Service
 *
 * Provides a wrapper around the Claude Flow CLI for executing commands
 * with proper stdout/stderr capture, timeout handling, and JSON parsing.
 */

import { spawn, type ChildProcess } from 'child_process';

/**
 * Result of a CLI command execution
 */
export interface CommandResult {
	stdout: string;
	stderr: string;
	exitCode: number;
	timedOut: boolean;
	duration: number;
}

/**
 * Options for command execution
 */
export interface CommandOptions {
	/** Timeout in milliseconds (default: 5 minutes) */
	timeout?: number;
	/** Working directory for the command */
	cwd?: string;
	/** Additional environment variables */
	env?: Record<string, string>;
	/** Whether to stream output via callback */
	onOutput?: (line: string, isStderr: boolean) => void;
}

/**
 * Error thrown when a CLI command fails
 */
export class CLIError extends Error {
	constructor(
		message: string,
		public readonly exitCode: number,
		public readonly stderr: string,
		public readonly timedOut: boolean = false
	) {
		super(message);
		this.name = 'CLIError';
	}
}

/**
 * Claude Flow CLI wrapper class
 *
 * Provides methods for executing Claude Flow CLI commands with proper
 * error handling, timeout management, and output parsing.
 */
export class ClaudeFlowCLI {
	private readonly defaultTimeout = 300000; // 5 minutes
	private readonly cliCommand = 'npx';
	private readonly cliArgs = ['@claude-flow/cli@latest'];

	/**
	 * Execute a Claude Flow CLI command
	 *
	 * @param command - The command to execute (e.g., 'agent', 'swarm')
	 * @param args - Arguments for the command
	 * @param options - Execution options
	 * @returns Promise resolving to CommandResult
	 */
	async execute(
		command: string,
		args: string[] = [],
		options: CommandOptions = {}
	): Promise<CommandResult> {
		return new Promise((resolve, reject) => {
			const timeout = options.timeout ?? this.defaultTimeout;
			const startTime = Date.now();
			let timedOut = false;
			let proc: ChildProcess;

			const fullArgs = [...this.cliArgs, command, ...args];

			try {
				proc = spawn(this.cliCommand, fullArgs, {
					cwd: options.cwd ?? process.cwd(),
					env: { ...process.env, ...options.env },
					shell: true
				});
			} catch (error) {
				reject(new Error(`Failed to spawn CLI process: ${error}`));
				return;
			}

			let stdout = '';
			let stderr = '';

			proc.stdout?.on('data', (data: Buffer) => {
				const chunk = data.toString();
				stdout += chunk;
				if (options.onOutput) {
					// Split by lines and emit each
					chunk.split('\n').filter(Boolean).forEach(line => {
						options.onOutput!(line, false);
					});
				}
			});

			proc.stderr?.on('data', (data: Buffer) => {
				const chunk = data.toString();
				stderr += chunk;
				if (options.onOutput) {
					chunk.split('\n').filter(Boolean).forEach(line => {
						options.onOutput!(line, true);
					});
				}
			});

			const timer = setTimeout(() => {
				timedOut = true;
				proc.kill('SIGTERM');
				// Give process time to clean up, then force kill
				setTimeout(() => {
					if (!proc.killed) {
						proc.kill('SIGKILL');
					}
				}, 5000);
			}, timeout);

			proc.on('close', (code: number | null) => {
				clearTimeout(timer);
				const duration = Date.now() - startTime;

				resolve({
					stdout: stdout.trim(),
					stderr: stderr.trim(),
					exitCode: code ?? (timedOut ? -1 : 0),
					timedOut,
					duration
				});
			});

			proc.on('error', (error: Error) => {
				clearTimeout(timer);
				reject(new Error(`CLI process error: ${error.message}`));
			});
		});
	}

	/**
	 * Execute a command and parse JSON output
	 *
	 * @param command - The command to execute
	 * @param args - Arguments for the command
	 * @param options - Execution options
	 * @returns Promise resolving to parsed JSON
	 * @throws CLIError if command fails or output is not valid JSON
	 */
	async executeJson<T>(
		command: string,
		args: string[] = [],
		options: CommandOptions = {}
	): Promise<T> {
		// Add --format json flag if not already present
		const argsWithJson = args.includes('--format')
			? args
			: [...args, '--format', 'json'];

		const result = await this.execute(command, argsWithJson, options);

		if (result.timedOut) {
			throw new CLIError(
				'Command timed out',
				result.exitCode,
				result.stderr,
				true
			);
		}

		if (result.exitCode !== 0) {
			throw new CLIError(
				`Command failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`,
				result.exitCode,
				result.stderr
			);
		}

		try {
			// Try to find JSON in the output (may have other text before/after)
			const jsonMatch = result.stdout.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
			if (jsonMatch) {
				return JSON.parse(jsonMatch[1]) as T;
			}
			return JSON.parse(result.stdout) as T;
		} catch (parseError) {
			throw new CLIError(
				`Failed to parse JSON output: ${result.stdout.substring(0, 200)}`,
				result.exitCode,
				result.stderr
			);
		}
	}

	/**
	 * Check if Claude Flow CLI is available
	 *
	 * @returns Promise resolving to true if CLI is available
	 */
	async isAvailable(): Promise<boolean> {
		try {
			const result = await this.execute('--version', [], { timeout: 10000 });
			return result.exitCode === 0;
		} catch {
			return false;
		}
	}

	/**
	 * Get CLI version information
	 *
	 * @returns Promise resolving to version string
	 */
	async getVersion(): Promise<string> {
		const result = await this.execute('--version', [], { timeout: 10000 });
		if (result.exitCode !== 0) {
			throw new CLIError(
				'Failed to get CLI version',
				result.exitCode,
				result.stderr
			);
		}
		return result.stdout;
	}
}

// Singleton instance for convenience
export const claudeFlowCLI = new ClaudeFlowCLI();
