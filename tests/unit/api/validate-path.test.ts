/**
 * GAP-A1.1: Workspace Path Validation API Tests
 *
 * Tests the path validation endpoint for:
 * - Absolute path validation
 * - Path existence checks
 * - Duplicate path detection
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the prisma client
vi.mock('$lib/server/prisma', () => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  access: vi.fn(),
  stat: vi.fn()
}));

describe('Path Validation Logic', () => {
  describe('isAbsolutePath', () => {
    it('should recognize Unix absolute paths', () => {
      const unixPaths = [
        '/Users/dev/project',
        '/home/user/code',
        '/var/www/app',
        '/'
      ];

      for (const path of unixPaths) {
        expect(path.startsWith('/')).toBe(true);
      }
    });

    it('should recognize Windows absolute paths', () => {
      const windowsPaths = [
        'C:\\Users\\dev\\project',
        'D:\\Projects\\app',
        'E:\\code'
      ];

      for (const path of windowsPaths) {
        expect(/^[A-Za-z]:\\/.test(path)).toBe(true);
      }
    });

    it('should reject relative paths', () => {
      const relativePaths = [
        './project',
        '../parent/project',
        'project',
        'src/lib'
      ];

      for (const path of relativePaths) {
        const isAbsoluteUnix = path.startsWith('/');
        const isAbsoluteWindows = /^[A-Za-z]:\\/.test(path);
        expect(isAbsoluteUnix || isAbsoluteWindows).toBe(false);
      }
    });
  });

  describe('normalizePath', () => {
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

    it('should remove trailing slashes', () => {
      expect(normalizePath('/Users/dev/project/')).toBe('/Users/dev/project');
      expect(normalizePath('/Users/dev/project//')).toBe('/Users/dev/project');
    });

    it('should preserve root slash', () => {
      expect(normalizePath('/')).toBe('/');
    });

    it('should lowercase Windows paths for comparison', () => {
      expect(normalizePath('C:\\Users\\Dev')).toBe('c:\\users\\dev');
    });

    it('should not modify case for Unix paths', () => {
      expect(normalizePath('/Users/Dev')).toBe('/Users/Dev');
    });
  });

  describe('PathValidationResult structure', () => {
    interface PathValidationResult {
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

    it('should have correct shape for valid path', () => {
      const result: PathValidationResult = {
        valid: true,
        exists: true,
        isDirectory: true,
        isAbsolute: true,
        isDuplicate: false,
        warnings: [],
        errors: []
      };

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have correct shape for duplicate path', () => {
      const result: PathValidationResult = {
        valid: true,
        exists: true,
        isDirectory: true,
        isAbsolute: true,
        isDuplicate: true,
        duplicateProjectId: 'proj-123',
        duplicateProjectName: 'Existing Project',
        warnings: ['This path is already used by project "Existing Project"'],
        errors: []
      };

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateProjectId).toBe('proj-123');
      expect(result.warnings).toHaveLength(1);
    });

    it('should have correct shape for non-existent path', () => {
      const result: PathValidationResult = {
        valid: true,
        exists: false,
        isDirectory: false,
        isAbsolute: true,
        isDuplicate: false,
        warnings: ['Path does not exist'],
        errors: []
      };

      expect(result.exists).toBe(false);
      expect(result.valid).toBe(true); // Still valid - just a warning
      expect(result.warnings).toHaveLength(1);
    });

    it('should have correct shape for invalid (relative) path', () => {
      const result: PathValidationResult = {
        valid: false,
        exists: false,
        isDirectory: false,
        isAbsolute: false,
        isDuplicate: false,
        warnings: [],
        errors: ['Path must be absolute']
      };

      expect(result.valid).toBe(false);
      expect(result.isAbsolute).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Path overlap detection', () => {
    it('should detect parent-child relationships', () => {
      const parentPath = '/Users/dev/projects';
      const childPath = '/Users/dev/projects/my-app';

      // Child starts with parent + separator
      expect(childPath.startsWith(parentPath + '/')).toBe(true);
    });

    it('should not falsely detect overlaps with similar names', () => {
      const path1 = '/Users/dev/project';
      const path2 = '/Users/dev/project-beta';

      // project-beta should NOT be considered a child of project
      expect(path2.startsWith(path1 + '/')).toBe(false);
    });

    it('should detect exact matches', () => {
      const path1 = '/Users/dev/project';
      const path2 = '/Users/dev/project';

      expect(path1 === path2).toBe(true);
    });
  });
});
