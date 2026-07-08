<template>
  <div
    class="image-gen-node"
    :class="`status-${status}`"
    :style="nodeStyle"
    @dblclick="handleNodeDoubleClick"
  >
    <div class="node-header">
      <div class="header-left">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span class="node-title">文生图</span>
      </div>
      <div class="header-actions">
        <span
          v-if="status === 'processing'"
          class="loading loading-spinner loading-xs"
        />
        <svg
          v-else-if="status === 'completed'"
          xmlns="http://www.w3.org/2000/svg"
          class="h-3 w-3 text-success"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <button
          v-if="status === 'pending' || status === 'failed'"
          class="btn btn-circle btn-xs btn-primary"
          :disabled="isGenerating"
          title="生成图片"
          @click="handleGenerate"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3 w-3"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <button
          v-if="status === 'completed'"
          class="btn btn-circle btn-xs btn-ghost"
          title="重新生成"
          @click="handleRegenerate"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </div>

    <div class="image-preview">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        alt="生成的图片"
        class="preview-img"
        @load="handleImageLoad"
      >
      <div
        v-else
        class="image-placeholder"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-8 w-8 opacity-30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ImageGenNode',
  props: {
    status: {
      type: String,
      default: 'pending'
    },
    position: {
      type: Object,
      default: () => ({ x: 0, y: 0 })
    },
    imageUrl: {
      type: String,
      default: ''
    },
    mediaWidth: {
      type: Number,
      default: 1080
    },
    mediaHeight: {
      type: Number,
      default: 1080
    },
    prompt: {
      type: String,
      default: ''
    },
    storyboardId: {
      type: [String, Number],
      required: true
    }
  },
  data() {
    return {
      localPrompt: this.prompt,
      isGenerating: false,
      lastSavedPrompt: this.prompt || '',
      isEditing: false
    };
  },
  computed: {
    previewHeight() {
      const safeWidth = this.mediaWidth > 0 ? this.mediaWidth : 1;
      const safeHeight = this.mediaHeight > 0 ? this.mediaHeight : 1;
      const previewHeight = 250 * (safeHeight / safeWidth);
      return Math.max(140, Math.round(previewHeight));
    },
    nodeStyle() {
      return {
        position: 'absolute',
        left: `${this.position.x}px`,
        top: `${this.position.y}px`,
        '--media-preview-height': `${this.previewHeight}px`
      };
    }
  },
  watch: {
    prompt(newVal) {
      if (!this.isEditing) {
        this.localPrompt = newVal;
        this.lastSavedPrompt = newVal || '';
      }
    }
  },
  methods: {
    handleNodeDoubleClick(event) {
      if (this.shouldIgnoreNodeDoubleClick(event.target)) {
        return;
      }
      this.$emit('node-dblclick');
    },
    shouldIgnoreNodeDoubleClick(target) {
      if (!(target instanceof Element)) {
        return false;
      }

      return Boolean(
        target.closest('button, input, textarea, select, option, video, [contenteditable="true"], .prevent-canvas-wheel')
      );
    },
    handleImageLoad(event) {
      const target = event?.target;
      const width = Number(target?.naturalWidth);
      const height = Number(target?.naturalHeight);

      if (width > 0 && height > 0) {
        this.$emit('media-loaded', {
          storyboardId: this.storyboardId,
          width,
          height
        });
      }
    },
    handleFocus() {
      this.isEditing = true;
    },
    handleBlur() {
      this.isEditing = false;
      this.handleAutoSave();
    },
    handleAutoSave() {
      const nextPrompt = this.localPrompt || '';
      if (nextPrompt === this.lastSavedPrompt) {
        return;
      }
      this.$emit('save', {
        storyboardId: this.storyboardId,
        data: {
          image_prompt: nextPrompt
        },
        silent: true
      });
      this.lastSavedPrompt = nextPrompt;
    },
    async handleGenerate(forceRegenerate = false) {
      if (!this.localPrompt || !this.localPrompt.trim()) {
        this.$message?.warning('请先输入提示词');
        return;
      }

      this.isGenerating = true;
      try {
        this.$emit('generate', {
          storyboardId: this.storyboardId,
          prompt: this.localPrompt,
          forceRegenerate
        });
      } catch (error) {
        console.error('[ImageGenNode] 生成失败:', error);
        this.$message?.error(error.message || '生成图片失败');
      } finally {
        this.isGenerating = false;
      }
    },
    async handleRegenerate() {
      const confirmed = await this.$confirm(
        '确定要重新生成图片吗？',
        '重新生成图片',
        { tone: 'warning', confirmText: '重新生成' }
      );

      if (confirmed) {
        await this.handleGenerate(true);
      }
    }
  }
};
</script>

<style scoped>
.image-gen-node {
  width: 250px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 18px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
  z-index: 2;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layout-shell.theme-dark .image-gen-node {
  background: rgba(15, 23, 42, 0.92);
  border-color: rgba(148, 163, 184, 0.14);
  box-shadow: 0 20px 44px rgba(2, 6, 23, 0.45);
}

.image-gen-node:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 48px rgba(14, 165, 233, 0.16);
  border-color: rgba(14, 165, 233, 0.18);
}

.layout-shell.theme-dark .image-gen-node:hover {
  box-shadow: 0 24px 48px rgba(14, 165, 233, 0.16);
}

.status-pending {
  border-color: rgba(148, 163, 184, 0.1);
  background: rgba(255, 255, 255, 0.92);
}

.layout-shell.theme-dark .status-pending {
  border-color: rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.92);
}

.status-processing {
  border-color: rgba(14, 165, 233, 0.14);
  background: rgba(240, 249, 255, 0.96);
}

.layout-shell.theme-dark .status-processing {
  border-color: rgba(56, 189, 248, 0.18);
  background: rgba(14, 116, 144, 0.16);
}

.status-completed {
  border-color: rgba(34, 197, 94, 0.12);
  background: rgba(255, 255, 255, 0.92);
}

.layout-shell.theme-dark .status-completed {
  border-color: rgba(74, 222, 128, 0.16);
  background: rgba(15, 23, 42, 0.92);
}

.status-failed {
  border-color: rgba(248, 113, 113, 0.14);
  background: rgba(254, 242, 242, 0.92);
}

.layout-shell.theme-dark .status-failed {
  border-color: rgba(248, 113, 113, 0.18);
  background: rgba(127, 29, 29, 0.16);
}

.node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem 0.9rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.88));
}

.layout-shell.theme-dark .node-header {
  border-bottom-color: rgba(148, 163, 184, 0.18);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9));
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.node-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: hsl(var(--bc));
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.status-processing .header-actions {
  color: hsl(var(--in));
}

.status-completed .header-actions {
  color: hsl(var(--su));
}

.image-preview {
  width: 100%;
  height: var(--media-preview-height, 140px);
  min-height: 140px;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.layout-shell.theme-dark .image-preview {
  background: rgba(51, 65, 85, 0.32);
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>
