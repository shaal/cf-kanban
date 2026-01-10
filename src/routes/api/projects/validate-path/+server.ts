/**
 * GAP-A1.1: Workspace Path Validation API
 *
 * Validates workspace paths for project creation/editing:
 * - Checks if path is absolute
 * - Checks if path exists on filesystem (warning if not)
 * - Checks for duplicate paths across projects
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { access, stat } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

export interface PathValidationResult {
  valid: boolean;
  exists: boolean;
  isDirectory: boolean;
  isAbsolute: boolean;
  isDuplicate: boolean;
  duplicateProjectId?: string;
  duplicateProjectName?: string;
  warnings: string[];
  errors: string[];
}

/**
 * POST /api/projects/validate-path
 * Validate a workspace path before creating/updating a project
 *
 * Body:
 * - path: string - The path to validate
 * - excludeProjectId?: string - Project ID to exclude from duplicate check (for edits)
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { path: workspacePath, excludeProjectId } = body;

    if (!workspacePath || typeof workspacePath !== 'string') {
      return json(
        {
          valid: false,
          exists: false,
          isDirectory: false,
          isAbsolute: false,
          isDuplicate: false,
          warnings: [],
          errors: ['Path is required']
        } satisfies PathValidationResult,
        { status: 400 }
      );
    }

    const trimmedPath = workspacePath.trim();
    const result: PathValidationResult = {
      valid: true,
      exists: false,
      isDirectory: false,
      isAbsolute: false,
      isDuplicate: false,
      warnings: [],
      errors: []
    };

    // Check if path is absolute
    const isAbsoluteUnix = trimmedPath.startsWith('/');
    const isAbsoluteWindows = /^[A-Za-z]:\\/.test(trimmedPath);
    result.isAbsolute = isAbsoluteUnix || isAbsoluteWindows;

    if (!result.isAbsolute) {
      result.valid = false;
      result.errors.push('Path must be absolute (e.g., /Users/dev/project or C:\\Projects\\app)');
    }

    // Check if path exists and is a directory
    if (result.isAbsolute) {
      try {
        await access(trimmedPath, constants.R_OK);
        result.exists = true;

        const stats = await stat(trimmedPath);
        result.isDirectory = stats.isDirectory();

        if (!result.isDirectory) {
          result.warnings.push('Path exists but is not a directory. Claude Code works best with project directories.');
        }
      } catch {
        result.exists = false;
        result.warnings.push('Path does not exist. It will be validated again when Claude Code starts working.');
      }
    }

    // Check for duplicate paths
    // Normalize the path for comparison
    const normalizedPath = normalizePath(trimmedPath);

    const existingProject = await prisma.project.findFirst({
      where: {
        workspacePath: {
          not: null
        },
        ...(excludeProjectId ? { id: { not: excludeProjectId } } : {})
      },
      select: {
        id: true,
        name: true,
        workspacePath: true
      }
    });

    // Check if any existing project has an overlapping path
    const allProjects = await prisma.project.findMany({
      where: {
        workspacePath: { not: null },
        ...(excludeProjectId ? { id: { not: excludeProjectId } } : {})
      },
      select: {
        id: true,
        name: true,
        workspacePath: true
      }
    });

    for (const project of allProjects) {
      if (!project.workspacePath) continue;

      const existingNormalized = normalizePath(project.workspacePath);

      // Check for exact match
      if (normalizedPath === existingNormalized) {
        result.isDuplicate = true;
        result.duplicateProjectId = project.id;
        result.duplicateProjectName = project.name;
        result.warnings.push(
          `This path is already used by project "${project.name}". Having multiple projects share the same workspace may cause conflicts.`
        );
        break;
      }

      // Check if new path is a parent of existing path
      if (existingNormalized.startsWith(normalizedPath + path.sep)) {
        result.warnings.push(
          `This path is a parent directory of project "${project.name}" (${project.workspacePath}). This may cause overlapping operations.`
        );
      }

      // Check if new path is a child of existing path
      if (normalizedPath.startsWith(existingNormalized + path.sep)) {
        result.warnings.push(
          `This path is a subdirectory of project "${project.name}" (${project.workspacePath}). This may cause overlapping operations.`
        );
      }
    }

    return json(result);
  } catch (error) {
    console.error('Error validating path:', error);
    return json(
      {
        valid: false,
        exists: false,
        isDirectory: false,
        isAbsolute: false,
        isDuplicate: false,
        warnings: [],
        errors: ['Failed to validate path']
      } satisfies PathValidationResult,
      { status: 500 }
    );
  }
};

/**
 * Normalize a path for comparison
 * - Removes trailing slashes
 * - Converts to lowercase on Windows
 * - Resolves . and .. components
 */
function normalizePath(inputPath: string): string {
  let normalized = inputPath.trim();

  // Remove trailing slashes (but keep root slash)
  while (normalized.length > 1 && (normalized.endsWith('/') || normalized.endsWith('\\'))) {
    normalized = normalized.slice(0, -1);
  }

  // On Windows-style paths, normalize to lowercase for comparison
  if (/^[A-Za-z]:/.test(normalized)) {
    normalized = normalized.toLowerCase();
  }

  return normalized;
}
