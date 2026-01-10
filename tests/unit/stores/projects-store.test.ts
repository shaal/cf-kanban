/**
 * Tests for Projects Store
 *
 * TASK-032: Create real-time Svelte stores
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import type { Project } from '$lib/types';
import {
  projects,
  currentProject,
  currentProjectUsers,
  initProjects,
  addProject,
  updateProject,
  removeProject,
  setCurrentProject,
  updateUserCount,
  addUser,
  removeUser,
  clearProjects,
} from '$lib/stores/projects';

const createMockProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'project-1',
  name: 'Test Project',
  description: 'Description',
  settings: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

describe('Projects Store', () => {
  beforeEach(() => {
    clearProjects();
  });

  describe('initProjects', () => {
    it('should initialize store with projects', () => {
      const mockProjects = [
        createMockProject({ id: 'project-1' }),
        createMockProject({ id: 'project-2', name: 'Second Project' }),
      ];

      initProjects(mockProjects);

      const state = get(projects);
      expect(state).toHaveLength(2);
      expect(state[0].id).toBe('project-1');
      expect(state[1].id).toBe('project-2');
    });

    it('should replace existing projects', () => {
      initProjects([createMockProject({ id: 'project-1' })]);
      initProjects([createMockProject({ id: 'project-2' })]);

      const state = get(projects);
      expect(state).toHaveLength(1);
      expect(state[0].id).toBe('project-2');
    });
  });

  describe('addProject', () => {
    it('should add a project to the store', () => {
      const project = createMockProject();

      addProject(project);

      const state = get(projects);
      expect(state).toHaveLength(1);
      expect(state[0]).toEqual(project);
    });

    it('should not add duplicate projects', () => {
      const project = createMockProject();

      addProject(project);
      addProject(project);

      const state = get(projects);
      expect(state).toHaveLength(1);
    });
  });

  describe('updateProject', () => {
    it('should update an existing project', () => {
      const project = createMockProject();
      initProjects([project]);

      updateProject('project-1', { name: 'Updated Name' });

      const state = get(projects);
      expect(state[0].name).toBe('Updated Name');
    });

    it('should do nothing if project not found', () => {
      const project = createMockProject();
      initProjects([project]);

      updateProject('non-existent', { name: 'Updated Name' });

      const state = get(projects);
      expect(state[0].name).toBe('Test Project');
    });
  });

  describe('removeProject', () => {
    it('should remove a project by id', () => {
      const project1 = createMockProject({ id: 'project-1' });
      const project2 = createMockProject({ id: 'project-2' });
      initProjects([project1, project2]);

      removeProject('project-1');

      const state = get(projects);
      expect(state).toHaveLength(1);
      expect(state[0].id).toBe('project-2');
    });

    it('should return the removed project', () => {
      const project = createMockProject();
      initProjects([project]);

      const removed = removeProject('project-1');

      expect(removed).toEqual(project);
    });

    it('should clear current project if it was removed', () => {
      const project = createMockProject();
      initProjects([project]);
      setCurrentProject(project);

      removeProject('project-1');

      const current = get(currentProject);
      expect(current).toBeNull();
    });
  });

  describe('setCurrentProject', () => {
    it('should set the current project', () => {
      const project = createMockProject();

      setCurrentProject(project);

      const current = get(currentProject);
      expect(current).toEqual(project);
    });

    it('should allow setting null', () => {
      setCurrentProject(createMockProject());
      setCurrentProject(null);

      const current = get(currentProject);
      expect(current).toBeNull();
    });

    it('should reset user count when changing projects', () => {
      setCurrentProject(createMockProject({ id: 'project-1' }));
      addUser('user-1');
      addUser('user-2');

      setCurrentProject(createMockProject({ id: 'project-2' }));

      const users = get(currentProjectUsers);
      expect(users).toHaveLength(0);
    });
  });

  describe('updateUserCount', () => {
    it('should set the user count', () => {
      setCurrentProject(createMockProject());

      updateUserCount(['user-1', 'user-2', 'user-3']);

      const users = get(currentProjectUsers);
      expect(users).toHaveLength(3);
    });
  });

  describe('addUser', () => {
    it('should add a user to the current project', () => {
      setCurrentProject(createMockProject());

      addUser('user-1');

      const users = get(currentProjectUsers);
      expect(users).toContain('user-1');
    });

    it('should not add duplicate users', () => {
      setCurrentProject(createMockProject());

      addUser('user-1');
      addUser('user-1');

      const users = get(currentProjectUsers);
      expect(users).toHaveLength(1);
    });
  });

  describe('removeUser', () => {
    it('should remove a user from the current project', () => {
      setCurrentProject(createMockProject());
      updateUserCount(['user-1', 'user-2']);

      removeUser('user-1');

      const users = get(currentProjectUsers);
      expect(users).toHaveLength(1);
      expect(users).not.toContain('user-1');
    });
  });

  describe('clearProjects', () => {
    it('should remove all projects and current project', () => {
      initProjects([
        createMockProject({ id: 'project-1' }),
        createMockProject({ id: 'project-2' }),
      ]);
      setCurrentProject(createMockProject());

      clearProjects();

      expect(get(projects)).toHaveLength(0);
      expect(get(currentProject)).toBeNull();
      expect(get(currentProjectUsers)).toHaveLength(0);
    });
  });
});
