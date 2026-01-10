<script lang="ts">
  /**
   * GAP-A1.1: Duplicate Path Warning Modal
   *
   * Shows a warning when the user tries to use a workspace path
   * that is already used by another project.
   */
  import { fly, fade } from 'svelte/transition';
  import Button from './Button.svelte';
  import { AlertTriangle, X } from 'lucide-svelte';

  interface Props {
    open: boolean;
    duplicateProjectName: string;
    duplicateProjectId: string;
    workspacePath: string;
    onContinue: () => void;
    onCancel: () => void;
  }

  let { open, duplicateProjectName, duplicateProjectId, workspacePath, onContinue, onCancel }: Props = $props();

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onCancel();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center"
    transition:fade={{ duration: 150 }}
  >
    <!-- Overlay -->
    <button
      type="button"
      class="absolute inset-0 bg-black/50 cursor-default"
      onclick={onCancel}
      aria-label="Close modal"
      tabindex="-1"
    ></button>

    <!-- Modal content -->
    <div
      class="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
      transition:fly={{ y: 20, duration: 200 }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="warning-title"
      aria-describedby="warning-description"
    >
      <!-- Header -->
      <header class="flex items-center justify-between px-6 py-4 border-b border-amber-200 bg-amber-50 rounded-t-lg">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-amber-100 rounded-lg">
            <AlertTriangle class="w-5 h-5 text-amber-600" />
          </div>
          <h2 id="warning-title" class="text-lg font-semibold text-amber-900">
            Duplicate Workspace Path
          </h2>
        </div>
        <button
          type="button"
          class="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors"
          onclick={onCancel}
          aria-label="Close"
        >
          <X class="w-5 h-5" />
        </button>
      </header>

      <!-- Content -->
      <div class="p-6">
        <p id="warning-description" class="text-gray-700 mb-4">
          This workspace path is already being used by another project:
        </p>

        <div class="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
          <p class="text-sm font-medium text-gray-900 mb-1">
            Project: <a href="/projects/{duplicateProjectId}" class="text-blue-600 hover:underline">{duplicateProjectName}</a>
          </p>
          <p class="text-xs font-mono text-gray-500 break-all">
            {workspacePath}
          </p>
        </div>

        <div class="p-3 bg-amber-50 border border-amber-200 rounded-md mb-6">
          <p class="text-sm text-amber-800">
            <strong>Warning:</strong> Having multiple projects share the same workspace path may cause conflicts when agents operate on files. Changes from one project may affect the other.
          </p>
        </div>

        <p class="text-sm text-gray-600 mb-4">
          Do you want to continue anyway?
        </p>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onclick={onCancel}
          >
            Choose Different Path
          </Button>
          <Button
            type="button"
            variant="destructive"
            onclick={onContinue}
          >
            Continue Anyway
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
