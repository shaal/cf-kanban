import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * GAP-3.2.5: Individual Attachment Operations
 *
 * API endpoints for getting, downloading, and deleting individual attachments.
 */

/**
 * GET /api/tickets/:id/attachments/:attachmentId
 * Get attachment metadata or download the file
 *
 * Query params:
 * - download=true: Return the file content for download
 */
export const GET: RequestHandler = async ({ params, url }) => {
	const { id: ticketId, attachmentId } = params;
	const download = url.searchParams.get('download') === 'true';

	// Find the attachment
	const attachment = await prisma.ticketAttachment.findFirst({
		where: {
			id: attachmentId,
			ticketId
		}
	});

	if (!attachment) {
		throw error(404, 'Attachment not found');
	}

	if (download) {
		// Return file content for download
		const fullPath = join(process.cwd(), 'uploads', attachment.path);

		if (!existsSync(fullPath)) {
			throw error(404, 'File not found on disk');
		}

		try {
			const fileBuffer = await readFile(fullPath);

			return new Response(fileBuffer, {
				headers: {
					'Content-Type': attachment.mimeType,
					'Content-Disposition': `attachment; filename="${attachment.filename}"`,
					'Content-Length': attachment.size.toString()
				}
			});
		} catch (err) {
			console.error('Error reading file:', err);
			throw error(500, 'Failed to read file');
		}
	}

	// Return metadata only
	return json({ attachment });
};

/**
 * DELETE /api/tickets/:id/attachments/:attachmentId
 * Delete an attachment
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const { id: ticketId, attachmentId } = params;

	try {
		// Find the attachment
		const attachment = await prisma.ticketAttachment.findFirst({
			where: {
				id: attachmentId,
				ticketId
			}
		});

		if (!attachment) {
			throw error(404, 'Attachment not found');
		}

		// Delete file from disk
		const fullPath = join(process.cwd(), 'uploads', attachment.path);
		if (existsSync(fullPath)) {
			try {
				await unlink(fullPath);
			} catch (err) {
				console.error('Error deleting file from disk:', err);
				// Continue with database deletion even if file deletion fails
			}
		}

		// Delete database record
		await prisma.ticketAttachment.delete({
			where: { id: attachmentId }
		});

		return new Response(null, { status: 204 });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error deleting attachment:', err);
		return json({ error: 'Failed to delete attachment' }, { status: 500 });
	}
};
