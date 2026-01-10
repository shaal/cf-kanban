import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * GAP-3.2.5: Ticket Attachment Support
 *
 * API endpoints for managing file attachments on tickets.
 * Files are stored locally in the /uploads directory.
 */

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types for security
const ALLOWED_MIME_TYPES = [
	// Images
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/svg+xml',
	// Documents
	'application/pdf',
	'text/plain',
	'text/markdown',
	'text/csv',
	// Office documents
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	// Archives
	'application/zip',
	'application/x-zip-compressed',
	// JSON/Config
	'application/json'
];

/**
 * Sanitize filename to prevent path traversal attacks
 */
function sanitizeFilename(filename: string): string {
	// Remove path separators and null bytes
	return filename
		.replace(/[/\\]/g, '_')
		.replace(/\0/g, '')
		.replace(/\.\./g, '_')
		.trim();
}

/**
 * Generate a unique stored filename
 */
function generateStoredName(originalFilename: string, ticketId: string): string {
	const timestamp = Date.now();
	const randomSuffix = Math.random().toString(36).substring(2, 8);
	const sanitized = sanitizeFilename(originalFilename);
	const ext = sanitized.includes('.') ? sanitized.substring(sanitized.lastIndexOf('.')) : '';
	const name = sanitized.includes('.')
		? sanitized.substring(0, sanitized.lastIndexOf('.'))
		: sanitized;

	return `${ticketId}_${timestamp}_${randomSuffix}_${name}${ext}`;
}

/**
 * GET /api/tickets/:id/attachments
 * List all attachments for a ticket
 */
export const GET: RequestHandler = async ({ params }) => {
	const { id: ticketId } = params;

	// Check if ticket exists
	const ticket = await prisma.ticket.findUnique({
		where: { id: ticketId }
	});

	if (!ticket) {
		throw error(404, 'Ticket not found');
	}

	const attachments = await prisma.ticketAttachment.findMany({
		where: { ticketId },
		orderBy: { createdAt: 'desc' }
	});

	return json({ attachments });
};

/**
 * POST /api/tickets/:id/attachments
 * Upload a new file attachment to a ticket
 *
 * Expects multipart/form-data with:
 * - file: The file to upload
 * - description: (optional) Description of the file
 */
export const POST: RequestHandler = async ({ params, request }) => {
	const { id: ticketId } = params;

	try {
		// Check if ticket exists
		const ticket = await prisma.ticket.findUnique({
			where: { id: ticketId }
		});

		if (!ticket) {
			throw error(404, 'Ticket not found');
		}

		// Parse multipart form data
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const description = formData.get('description') as string | null;

		if (!file) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		// Validate file size
		if (file.size > MAX_FILE_SIZE) {
			return json(
				{ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
				{ status: 400 }
			);
		}

		// Validate MIME type
		if (!ALLOWED_MIME_TYPES.includes(file.type)) {
			return json(
				{ error: `File type not allowed: ${file.type}` },
				{ status: 400 }
			);
		}

		// Create uploads directory if it doesn't exist
		const uploadsDir = join(process.cwd(), 'uploads', ticketId);
		if (!existsSync(uploadsDir)) {
			await mkdir(uploadsDir, { recursive: true });
		}

		// Generate unique filename
		const storedName = generateStoredName(file.name, ticketId);
		const relativePath = join(ticketId, storedName);
		const fullPath = join(uploadsDir, storedName);

		// Write file to disk
		const buffer = Buffer.from(await file.arrayBuffer());
		await writeFile(fullPath, buffer);

		// Create database record
		const attachment = await prisma.ticketAttachment.create({
			data: {
				ticketId,
				filename: sanitizeFilename(file.name),
				storedName,
				mimeType: file.type,
				size: file.size,
				path: relativePath,
				description: description?.trim() || null
			}
		});

		return json({ attachment }, { status: 201 });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error uploading attachment:', err);
		return json({ error: 'Failed to upload attachment' }, { status: 500 });
	}
};
