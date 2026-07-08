<template>
  <div
    class="video-gen-node"
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
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span class="node-title">图生视频</span>
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
        <button
          v-else
          class="btn btn-circle btn-xs btn-primary"
          title="生成视频"
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
      </div>
    </div>

    <div class="video-preview">
      <video
        v-if="videoUrl"
        :src="videoUrl"
        class="preview-video"
        controls
      />
      <div
        v-else
        class="video-placeholder"
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
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VideoGenNode',
  props: {
    status: {
      type: String,
      default: 'pending'
    },
    position: {
      type: Object,
      default: () => ({ x: 0, y: 0 })
    },
    videoUrl: {
      type: String,
      default: ''
    },
    videoInfo: {
      type: Object,
      default: null
    },
    mediaWidth: {
      type: Number,
      default: 1080
    },
    mediaHeight: {
      type: Number,
      default: 1080
    },
    storyboardId: {
      type: [String, Number],
      required: true
    },
    canGenerate: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      isGenerating: false
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
    async handleGenerate(forceRegenerate = false) {
      this.isGenerating = true;
      try {
        this.$emit('generate', {
          storyboardId: this.storyboardId,
          forceRegenerate
        });
      } catch (error) {
        console.error('[VideoGenNode] 生成失败:', error);
        this.$message?.error(error.message || '生成视频失败');
      } finally {
        this.isGenerating = false;
      }
    },
    async handleRegenerate() {
      const confirmed = await this.$confirm(
        '确定要重新生成视频吗？',
        '重新生成视频',
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
.video-gen-node {
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

.layout-shell.theme-dark .video-gen-node {
  background: rgba(15, 23, 42, 0.92);
  border-color: rgba(148, 163, 184, 0.14);
  box-shadow: 0 20px 44px rgba(2, 6, 23, 0.45);
}

.video-gen-node:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 48px rgba(14, 165, 233, 0.16);
  border-color: rgba(14, 165, 233, 0.18);
}

.layout-shell.theme-dark .video-gen-node:hover {
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

.video-preview {
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

.layout-shell.theme-dark .video-preview {
  background: rgba(51, 65, 85, 0.32);
}

.preview-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>
