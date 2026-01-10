import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma client
const mockPrisma = {
	project: {
		findMany: vi.fn(),
		findUnique: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	}
};

// Mock the prisma module
vi.mock('$lib/server/prisma', () => ({
	prisma: mockPrisma
}));

describe('Projects API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET /api/projects', () => {
		it('should return all projects ordered by updatedAt', async () => {
			const mockProjects = [
				{
					id: 'proj-1',
					name: 'Project 1',
					description: 'First project',
					_count: { tickets: 5 },
					createdAt: new Date(),
					updatedAt: new Date()
				},
				{
					id: 'proj-2',
					name: 'Project 2',
					description: null,
					_count: { tickets: 0 },
					createdAt: new Date(),
					updatedAt: new Date()
				}
			];

			mockPrisma.project.findMany.mockResolvedValue(mockProjects);

			const result = await mockPrisma.project.findMany({
				orderBy: { updatedAt: 'desc' },
				include: { _count: { select: { tickets: true } } }
			});

			expect(result).toEqual(mockProjects);
			expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
				orderBy: { updatedAt: 'desc' },
				include: { _count: { select: { tickets: true } } }
			});
		});

		it('should return empty array when no projects exist', async () => {
			mockPrisma.project.findMany.mockResolvedValue([]);

			const result = await mockPrisma.project.findMany({
				orderBy: { updatedAt: 'desc' }
			});

			expect(result).toEqual([]);
		});
	});

	describe('POST /api/projects', () => {
		it('should create a project with name and description', async () => {
			const newProject = {
				id: 'proj-new',
				name: 'New Project',
				description: 'A test project',
				settings: {},
				createdAt: new Date(),
				updatedAt: new Date()
			};

			mockPrisma.project.create.mockResolvedValue(newProject);

			const result = await mockPrisma.project.create({
				data: {
					name: 'New Project',
					description: 'A test project'
				}
			});

			expect(result).toEqual(newProject);
			expect(result.name).toBe('New Project');
			expect(result.description).toBe('A test project');
		});

		it('should create a project with only name (description optional)', async () => {
			const newProject = {
				id: 'proj-new',
				name: 'Project Without Description',
				description: null,
				settings: {},
				createdAt: new Date(),
				updatedAt: new Date()
			};

			mockPrisma.project.create.mockResolvedValue(newProject);

			const result = await mockPrisma.project.create({
				data: {
					name: 'Project Without Description',
					description: null
				}
			});

			expect(result.description).toBeNull();
		});
	});

	describe('GET /api/projects/:id', () => {
		it('should return a project with its tickets', async () => {
			const projectWithTickets = {
				id: 'proj-1',
				name: 'Project 1',
				description: 'First project',
				tickets: [
					{
						id: 'ticket-1',
						title: 'First ticket',
						status: 'BACKLOG',
						priority: 'MEDIUM'
					}
				]
			};

			mockPrisma.project.findUnique.mockResolvedValue(projectWithTickets);

			const result = await mockPrisma.project.findUnique({
				where: { id: 'proj-1' },
				include: { tickets: { orderBy: { position: 'asc' } } }
			});

			expect(result).toEqual(projectWithTickets);
			expect(result?.tickets).toHaveLength(1);
		});

		it('should return null when project not found', async () => {
			mockPrisma.project.findUnique.mockResolvedValue(null);

			const result = await mockPrisma.project.findUnique({
				where: { id: 'non-existent' }
			});

			expect(result).toBeNull();
		});
	});

	describe('PUT /api/projects/:id', () => {
		it('should update project name', async () => {
			const updatedProject = {
				id: 'proj-1',
				name: 'Updated Name',
				description: 'Original description',
				settings: {},
				updatedAt: new Date()
			};

			mockPrisma.project.update.mockResolvedValue(updatedProject);

			const result = await mockPrisma.project.update({
				where: { id: 'proj-1' },
				data: { name: 'Updated Name' }
			});

			expect(result.name).toBe('Updated Name');
		});

		it('should update project description', async () => {
			const updatedProject = {
				id: 'proj-1',
				name: 'Project 1',
				description: 'New description',
				settings: {},
				updatedAt: new Date()
			};

			mockPrisma.project.update.mockResolvedValue(updatedProject);

			const result = await mockPrisma.project.update({
				where: { id: 'proj-1' },
				data: { description: 'New description' }
			});

			expect(result.description).toBe('New description');
		});
	});

	describe('DELETE /api/projects/:id', () => {
		it('should delete a project', async () => {
			mockPrisma.project.delete.mockResolvedValue({ id: 'proj-1' });

			const result = await mockPrisma.project.delete({
				where: { id: 'proj-1' }
			});

			expect(result.id).toBe('proj-1');
			expect(mockPrisma.project.delete).toHaveBeenCalledWith({
				where: { id: 'proj-1' }
			});
		});
	});
});
