<script lang="ts">
  /**
   * FileDropZone Component
   *
   * GAP-3.2.5: Ticket Attachment Support
   *
   * A drag-and-drop zone for uploading file attachments to tickets.
   * Features:
   * - Drag and drop file upload
   * - Click to browse files
   * - Visual feedback during drag
   * - File type and size validation
   * - Progress indicator during upload
   */
  import { createEventDispatcher } from 'svelte';
  import { Upload, X, File as FileIcon, Image, FileText, AlertCircle } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import type { TicketAttachment } from '$lib/types';

  interface Props {
    ticketId: string;
    maxFileSize?: number; // in bytes
    allowedTypes?: string[];
    class?: string;
  }

  let {
    ticketId,
    maxFileSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf', 'text/plain', 'text/markdown', 'text/csv',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip', 'application/x-zip-compressed', 'application/json'
    ],
    class: className = ''
  }: Props = $props();

  const dispatch = createEventDispatcher<{
    uploaded: { attachment: TicketAttachment };
    error: { message: string };
  }>();

  let isDragOver = $state(false);
  let isUploading = $state(false);
  let uploadProgress = $state(0);
  let error = $state('');
  let fileInput: HTMLInputElement;

  /**
   * Format file size for display
   */
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Validate a file before upload
   */
  function validateFile(file: File): string | null {
    if (file.size > maxFileSize) {
      return `File too large. Maximum size is ${formatFileSize(maxFileSize)}`;
    }
    if (!allowedTypes.includes(file.type)) {
      return `File type not allowed: ${file.type || 'unknown'}`;
    }
    return null;
  }

  /**
   * Upload a file
   */
  async function uploadFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      error = validationError;
      dispatch('error', { message: validationError });
      return;
    }

    isUploading = true;
    uploadProgress = 0;
    error = '';

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            uploadProgress = Math.round((event.loaded / event.total) * 100);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.attachment) {
                dispatch('uploaded', { attachment: response.attachment });
              }
              resolve();
            } catch {
              reject(new Error('Invalid response from server'));
            }
          } else {
            try {
              const response = JSON.parse(xhr.responseText);
              reject(new Error(response.error || 'Upload failed'));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.open('POST', `/api/tickets/${ticketId}/attachments`);
        xhr.send(formData);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      error = message;
      dispatch('error', { message });
    } finally {
      isUploading = false;
      uploadProgress = 0;
    }
  }

  /**
   * Handle drag events
   */
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  }

  /**
   * Handle file input change
   */
  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
    // Reset input to allow selecting the same file again
    input.value = '';
  }

  /**
   * Trigger file input click
   */
  function openFilePicker() {
    if (!isUploading) {
      fileInput?.click();
    }
  }

  /**
   * Clear error message
   */
  function clearError() {
    error = '';
  }
</script>

<div class={cn('relative', className)}>
  <!-- Hidden file input -->
  <input
    bind:this={fileInput}
    type="file"
    class="hidden"
    accept={allowedTypes.join(',')}
    onchange={handleFileSelect}
    disabled={isUploading}
  />

  <!-- Drop zone -->
  <button
    type="button"
    class={cn(
      'w-full border-2 border-dashed rounded-lg p-4 transition-all duration-200',
      'flex flex-col items-center justify-center gap-2',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      isDragOver
        ? 'border-blue-500 bg-blue-50'
        : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100',
      isUploading && 'cursor-wait opacity-75'
    )}
    onclick={openFilePicker}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    disabled={isUploading}
  >
    {#if isUploading}
      <!-- Upload progress -->
      <div class="flex flex-col items-center gap-2">
        <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm text-gray-600">Uploading... {uploadProgress}%</span>
        <div class="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            class="h-full bg-blue-500 transition-all duration-200"
            style="width: {uploadProgress}%"
          ></div>
        </div>
      </div>
    {:else}
      <!-- Upload instructions -->
      <Upload class="w-8 h-8 text-gray-400" />
      <div class="text-center">
        <span class="text-sm text-gray-600">
          {isDragOver ? 'Drop file here' : 'Drag and drop or click to upload'}
        </span>
        <p class="text-xs text-gray-400 mt-1">
          Max {formatFileSize(maxFileSize)}
        </p>
      </div>
    {/if}
  </button>

  <!-- Error message -->
  {#if error}
    <div class="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
      <AlertCircle class="w-4 h-4 text-red-500 flex-shrink-0" />
      <span class="text-sm text-red-700 flex-1">{error}</span>
      <button
        type="button"
        class="p-1 hover:bg-red-100 rounded"
        onclick={clearError}
      >
        <X class="w-4 h-4 text-red-500" />
      </button>
    </div>
  {/if}
</div>
