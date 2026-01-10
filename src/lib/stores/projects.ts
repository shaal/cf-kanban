/**
 * Projects Store - Reactive store for project state management
 *
 * TASK-032: Create real-time Svelte stores
 *
 * Features:
 * - Central project state management
 * - Current project tracking
 * - User count for real-time presence
 * - CRUD operations for projects
 */

import { writable, derived, get } from 'svelte/store';
import type { Project } from '$lib/types';

/** Main projects store */
const projectsStore = writable<Project[]>([]);

/** Current active project */
const currentProjectStore = writable<Project | null>(null);

/** Users currently viewing the current project */
const currentProjectUsersStore = writable<string[]>([]);

/**
 * Public read-only projects store
 */
export const projects = {
  subscribe: projectsStore.subscribe,
};

/**
 * Public read-only current project store
 */
export const currentProject = {
  subscribe: currentProjectStore.subscribe,
};

/**
 * Public read-only current project users store
 */
export const currentProjectUsers = {
  subscribe: currentProjectUsersStore.subscribe,
};

/**
 * Derived store for user count in current project
 */
export const currentProjectUserCount = derived(
  currentProjectUsersStore,
  ($users) => $users.length
);

/**
 * Initialize the projects store with data from the server
 * @param initialProjects - Array of projects to initialize with
 */
export function initProjects(initialProjects: Project[]): void {
  projectsStore.set([...initialProjects]);
}

/**
 * Add a new project to the store
 * @param project - The project to add
 */
export function addProject(project: Project): void {
  projectsStore.update((projects) => {
    // Check for duplicates
    if (projects.some((p) => p.id === project.id)) {
      return projects;
    }
    return [...projects, project];
  });
}

/**
 * Update an existing project
 * @param projectId - The ID of the project to update
 * @param updates - Partial project data to merge
 */
export function updateProject(projectId: string, updates: Partial<Project>): void {
  projectsStore.update((projects) =>
    projects.map((p) => (p.id === projectId ? { ...p, ...updates } : p))
  );

  // Also update current project if it's the one being updated
  const current = get(currentProjectStore);
  if (current?.id === projectId) {
    currentProjectStore.update((project) =>
      project ? { ...project, ...updates } : project
    );
  }
}

/**
 * Remove a project from the store
 * @param projectId - The ID of the project to remove
 * @returns The removed project or undefined if not found
 */
export function removeProject(projectId: string): Project | undefined {
  let removedProject: Project | undefined;

  projectsStore.update((projects) => {
    const index = projects.findIndex((p) => p.id === projectId);
    if (index === -1) {
      return projects;
    }
    removedProject = projects[index];
    return [...projects.slice(0, index), ...projects.slice(index + 1)];
  });

  // Clear current project if it was removed
  const current = get(currentProjectStore);
  if (current?.id === projectId) {
    currentProjectStore.set(null);
    currentProjectUsersStore.set([]);
  }

  return removedProject;
}

/**
 * Set the current active project
 * @param project - The project to set as current, or null to clear
 */
export function setCurrentProject(project: Project | null): void {
  const current = get(currentProjectStore);

  // Reset users when changing projects
  if (current?.id !== project?.id) {
    currentProjectUsersStore.set([]);
  }

  currentProjectStore.set(project);
}

/**
 * Update the list of users in the current project
 * @param users - Array of user IDs
 */
export function updateUserCount(users: string[]): void {
  currentProjectUsersStore.set(users);
}

/**
 * Add a user to the current project
 * @param userId - The user ID to add
 */
export function addUser(userId: string): void {
  currentProjectUsersStore.update((users) => {
    if (users.includes(userId)) {
      return users;
    }
    return [...users, userId];
  });
}

/**
 * Remove a user from the current project
 * @param userId - The user ID to remove
 */
export function removeUser(userId: string): void {
  currentProjectUsersStore.update((users) =>
    users.filter((id) => id !== userId)
  );
}

/**
 * Clear all projects and reset state
 */
export function clearProjects(): void {
  projectsStore.set([]);
  currentProjectStore.set(null);
  currentProjectUsersStore.set([]);
}

/**
 * Get a project by ID
 * @param projectId - The ID of the project to find
 * @returns The project or undefined if not found
 */
export function getProjectById(projectId: string): Project | undefined {
  return get(projectsStore).find((p) => p.id === projectId);
}
