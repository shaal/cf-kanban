<script lang="ts">
  /**
   * AttachmentsList Component
   *
   * GAP-3.2.5: Ticket Attachment Support
   *
   * Displays a list of file attachments for a ticket.
   * Features:
   * - Preview of image attachments
   * - File type icons for other files
   * - Download button for each attachment
   * - Delete button with confirmation
   * - File size and upload date display
   */
  import { createEventDispatcher } from 'svelte';
  import {
    File as FileIcon,
    Image,
    FileText,
    FileSpreadsheet,
    FileArchive,
    FileCode,
    Download,
    Trash2,
    ExternalLink
  } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import type { TicketAttachment } from '$lib/types';
  import Button from '$lib/components/ui/Button.svelte';

  interface Props {
    attachments: TicketAttachment[];
    ticketId: string;
    readonly?: boolean;
    compact?: boolean;
    class?: string;
  }

  let {
    attachments,
    ticketId,
    readonly = false,
    compact = false,
    class: className = ''
  }: Props = $props();

  const dispatch = createEventDispatcher<{
    deleted: { attachmentId: string };
    error: { message: string };
  }>();

  let deletingId = $state<string | null>(null);

  /**
   * Format file size for display
   */
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Format date for display
   */
  function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get icon component based on MIME type
   */
  function getFileIcon(mimeType: string) {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType === 'application/pdf') return FileText;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') {
      return FileSpreadsheet;
    }
    if (mimeType.includes('zip') || mimeType.includes('archive')) return FileArchive;
    if (mimeType === 'application/json' || mimeType === 'text/plain' || mimeType === 'text/markdown') {
      return FileCode;
    }
    return FileIcon;
  }

  /**
   * Check if attachment is an image
   */
  function isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/') && mimeType !== 'image/svg+xml';
  }

  /**
   * Get download URL for attachment
   */
  function getDownloadUrl(attachment: TicketAttachment): string {
    return `/api/tickets/${ticketId}/attachments/${attachment.id}?download=true`;
  }

  /**
   * Delete an attachment
   */
  async function deleteAttachment(attachmentId: string) {
    if (deletingId) return;

    deletingId = attachmentId;

    try {
      const response = await fetch(
        `/api/tickets/${ticketId}/attachments/${attachmentId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        dispatch('deleted', { attachmentId });
      } else {
        const data = await response.json();
        dispatch('error', { message: data.error || 'Failed to delete attachment' });
      }
    } catch (err) {
      dispatch('error', { message: 'Network error while deleting' });
    } finally {
      deletingId = null;
    }
  }
</script>

{#if attachments.length === 0}
  <p class="text-sm text-gray-500 italic">No attachments</p>
{:else}
  <div class={cn('space-y-2', className)}>
    {#each attachments as attachment (attachment.id)}
      {@const IconComponent = getFileIcon(attachment.mimeType)}
      <div
        class={cn(
          'flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200',
          'hover:bg-gray-100 transition-colors',
          compact && 'p-1.5'
        )}
      >
        <!-- Thumbnail or Icon -->
        <div class={cn(
          'flex-shrink-0 rounded overflow-hidden bg-white border border-gray-200',
          compact ? 'w-8 h-8' : 'w-10 h-10'
        )}>
          {#if isImage(attachment.mimeType)}
            <img
              src={getDownloadUrl(attachment)}
              alt={attachment.filename}
              class="w-full h-full object-cover"
            />
          {:else}
            <div class="w-full h-full flex items-center justify-center">
              <IconComponent class={cn('text-gray-400', compact ? 'w-4 h-4' : 'w-5 h-5')} />
            </div>
          {/if}
        </div>

        <!-- File info -->
        <div class="flex-1 min-w-0">
          <p class={cn(
            'font-medium text-gray-900 truncate',
            compact ? 'text-xs' : 'text-sm'
          )}>
            {attachment.filename}
          </p>
          {#if !compact}
            <p class="text-xs text-gray-500">
              {formatFileSize(attachment.size)} - {formatDate(attachment.createdAt)}
            </p>
          {/if}
        </div>

        <!-- Actions -->
        <div class="flex-shrink-0 flex items-center gap-1">
          <!-- Download button -->
          <a
            href={getDownloadUrl(attachment)}
            download={attachment.filename}
            class={cn(
              'p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors',
              compact && 'p-1'
            )}
            title="Download"
          >
            <Download class={cn(compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
          </a>

          <!-- Delete button -->
          {#if !readonly}
            <button
              type="button"
              class={cn(
                'p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                compact && 'p-1'
              )}
              title="Delete"
              onclick={() => deleteAttachment(attachment.id)}
              disabled={deletingId === attachment.id}
            >
              {#if deletingId === attachment.id}
                <div class={cn(
                  'border-2 border-red-500 border-t-transparent rounded-full animate-spin',
                  compact ? 'w-3.5 h-3.5' : 'w-4 h-4'
                )}></div>
              {:else}
                <Trash2 class={cn(compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
              {/if}
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}
