/**
 * GAP-A1.2: Editor URI Utilities
 *
 * Generates URI schemes for opening folders/files in code editors.
 * Supports VS Code primarily with fallback handling.
 */

/**
 * Supported editor types
 */
export type EditorType = 'vscode' | 'vscode-insiders' | 'cursor' | 'zed' | 'sublime' | 'atom';

/**
 * Editor configuration with URI scheme and display info
 */
interface EditorConfig {
  name: string;
  scheme: string;
  uriFormat: 'vscode' | 'file'; // vscode uses vscode://file/path, others may differ
}

/**
 * Editor configurations
 */
const EDITOR_CONFIGS: Record<EditorType, EditorConfig> = {
  vscode: {
    name: 'VS Code',
    scheme: 'vscode',
    uriFormat: 'vscode'
  },
  'vscode-insiders': {
    name: 'VS Code Insiders',
    scheme: 'vscode-insiders',
    uriFormat: 'vscode'
  },
  cursor: {
    name: 'Cursor',
    scheme: 'cursor',
    uriFormat: 'vscode'
  },
  zed: {
    name: 'Zed',
    scheme: 'zed',
    uriFormat: 'vscode'
  },
  sublime: {
    name: 'Sublime Text',
    scheme: 'subl',
    uriFormat: 'file'
  },
  atom: {
    name: 'Atom',
    scheme: 'atom',
    uriFormat: 'vscode'
  }
};

/**
 * Default editor to use
 */
const DEFAULT_EDITOR: EditorType = 'vscode';

/**
 * Get the user's preferred editor from localStorage or default
 */
export function getPreferredEditor(): EditorType {
  if (typeof window === 'undefined') return DEFAULT_EDITOR;

  const stored = localStorage.getItem('cf-kanban-preferred-editor');
  if (stored && stored in EDITOR_CONFIGS) {
    return stored as EditorType;
  }
  return DEFAULT_EDITOR;
}

/**
 * Set the user's preferred editor
 */
export function setPreferredEditor(editor: EditorType): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cf-kanban-preferred-editor', editor);
}

/**
 * Get all available editor options for UI selection
 */
export function getEditorOptions(): Array<{ value: EditorType; label: string }> {
  return Object.entries(EDITOR_CONFIGS).map(([key, config]) => ({
    value: key as EditorType,
    label: config.name
  }));
}

/**
 * Generate a URI to open a folder in the specified editor
 *
 * @param folderPath - Absolute path to the folder
 * @param editor - Editor to use (defaults to user preference or VS Code)
 * @returns URI string that can be used with window.open() or href
 *
 * @example
 * generateEditorUri('/Users/dev/my-project') // 'vscode://file/Users/dev/my-project'
 * generateEditorUri('/Users/dev/my-project', 'cursor') // 'cursor://file/Users/dev/my-project'
 */
export function generateEditorUri(folderPath: string, editor?: EditorType): string {
  const editorType = editor || getPreferredEditor();
  const config = EDITOR_CONFIGS[editorType];

  if (!folderPath) {
    throw new Error('Folder path is required');
  }

  // Normalize the path - remove leading slash for URI if present
  // VS Code scheme format: vscode://file/absolute/path
  const normalizedPath = folderPath.startsWith('/') ? folderPath.slice(1) : folderPath;

  // Encode special characters in the path
  const encodedPath = encodeURIComponent(normalizedPath).replace(/%2F/g, '/');

  if (config.uriFormat === 'vscode') {
    // vscode://file/path/to/folder
    return `${config.scheme}://file/${encodedPath}`;
  } else {
    // subl://open?url=file:///path (for Sublime)
    return `${config.scheme}://open?url=file:///${encodedPath}`;
  }
}

/**
 * Generate a URI to open a specific file at a line number
 *
 * @param filePath - Absolute path to the file
 * @param line - Optional line number to jump to
 * @param column - Optional column number
 * @param editor - Editor to use
 * @returns URI string
 *
 * @example
 * generateEditorFileUri('/Users/dev/my-project/src/app.ts', 42)
 * // 'vscode://file/Users/dev/my-project/src/app.ts:42'
 */
export function generateEditorFileUri(
  filePath: string,
  line?: number,
  column?: number,
  editor?: EditorType
): string {
  const baseUri = generateEditorUri(filePath, editor);

  if (line !== undefined) {
    const lineStr = column !== undefined ? `${line}:${column}` : String(line);
    return `${baseUri}:${lineStr}`;
  }

  return baseUri;
}

/**
 * Open a folder in the editor
 * Uses window.open with noopener for security
 *
 * @param folderPath - Absolute path to the folder
 * @param editor - Editor to use
 * @returns true if the open was triggered (doesn't guarantee editor opened)
 */
export function openInEditor(folderPath: string, editor?: EditorType): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const uri = generateEditorUri(folderPath, editor);
    // Use window.location for URI schemes as window.open may be blocked
    window.location.href = uri;
    return true;
  } catch (error) {
    console.error('Failed to open in editor:', error);
    return false;
  }
}

/**
 * Check if a path looks valid for editor opening
 * Basic validation - doesn't check if path exists (that's server-side)
 */
export function isValidEditorPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (typeof path !== 'string') return false;

  // Must be absolute path (starts with / on Unix or drive letter on Windows)
  const isAbsolute = path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path);
  if (!isAbsolute) return false;

  // Basic sanity checks
  if (path.length < 2) return false;
  if (path.includes('\0')) return false; // null bytes not allowed

  return true;
}

/**
 * Get the editor name for display
 */
export function getEditorName(editor?: EditorType): string {
  const editorType = editor || getPreferredEditor();
  return EDITOR_CONFIGS[editorType]?.name || 'Editor';
}
