<template>
  <div
    class="camera-node"
    :class="[{ 'node-highlighted': isHighlighted }, `status-${status}`]"
    :style="nodeStyle"
    @dblclick="handleNodeDoubleClick"
  >
    <!-- 节点头部 -->
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
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <span class="node-title">运镜</span>
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
          v-if="cameraId"
          class="btn btn-circle btn-xs btn-ghost"
          title="对话修改"
          @click="handleChatEdit"
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
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z"
            />
          </svg>
        </button>
        <button
          class="btn btn-circle btn-xs btn-primary"
          :title="cameraId ? '重新生成运镜' : '生成运镜'"
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

    <!-- 运镜类型 -->
    <!-- <div class="node-content">
      <label class="content-label">运镜类型</label>
      <input
        v-model="localMovementType"
        list="movement-type-options"
        class="input input-bordered input-xs w-full input-sm"
        :disabled="status === 'processing'"
        placeholder="自动选择或输入自定义类型"
        @blur="handleMovementTypeChange"
      />
      <datalist id="movement-type-options">
        <option value="">自动选择</option>
        <option value="static">静态</option>
        <option value="zoom_in">推进</option>
        <option value="zoom_out">拉远</option>
        <option value="pan_left">左移</option>
        <option value="pan_right">右移</option>
        <option value="tilt_up">上摇</option>
        <option value="tilt_down">下摇</option>
        <option value="dolly_in">前推</option>
        <option value="dolly_out">后拉</option>
      </datalist>
    </div> -->
    <!-- 运镜参数 -->
    <div
      v-if="status === 'completed' && movementParams"
      class="node-description"
    >
      <label class="content-label">运镜参数</label>
      <textarea
        v-model="localDescription"
        class="description-textarea"
        :disabled="status === 'processing'"
        placeholder="输入运镜参数描述"
        rows="10"
        @blur="handleDescriptionChange"
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'CameraNode',
  props: {
    status: {
      type: String,
      default: 'pending'
    },
    position: {
      type: Object,
      default: () => ({ x: 0, y: 0 })
    },
    movementType: {
      type: String,
      default: ''
    },
    movementParams: {
      type: Object,
      default: null
    },
    storyboardId: {
      type: [String, Number],
      required: true
    },
    cameraId: {
      type: [String, Number],
      default: null
    },
    canGenerate: {
      type: Boolean,
      default: true
    },
    isHighlighted: {
      type: Boolean,
      default: false
    }
  },
  data() {
    const initialDescription = this.getMovementDescription(this.movementParams);
    return {
      localMovementType: this.movementType,
      localDescription: initialDescription,
      isGenerating: false,
      lastSavedMovementType: this.movementType,
      lastSavedDescription: initialDescription
    };
  },
  computed: {
    nodeStyle() {
      return {
        position: 'absolute',
        left: `${this.position.x}px`,
        top: `${this.position.y}px`,
      };
    }
  },
  watch: {
    movementType(newVal) {
      this.localMovementType = newVal;
      this.lastSavedMovementType = newVal;
    },
    movementParams: {
      handler(newVal) {
        const nextDescription = this.getMovementDescription(newVal);
        if (nextDescription !== this.lastSavedDescription) {
          this.localDescription = nextDescription;
          this.lastSavedDescription = nextDescription;
        }
      },
      deep: true
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
    getMovementDescription(params) {
      return params?.description || '';
    },
    handleChatEdit() {
      if (!this.cameraId) {
        this.$message?.warning('请先生成一次运镜，再使用对话微调');
        return;
      }
      this.$emit('chat-edit', {
        cameraId: this.cameraId,
        storyboardId: this.storyboardId,
      });
    },
    async handleGenerate() {
      if (this.cameraId) {
        this.handleChatEdit();
        return;
      }
      this.isGenerating = true;
      try {
        this.$emit('generate', {
          storyboardId: this.storyboardId,
          movementType: this.localMovementType
        });
      } catch (error) {
        console.error('[CameraNode] 生成失败:', error);
        this.$message?.error(error.message || '生成运镜失败');
      } finally {
        this.isGenerating = false;
      }
    },
    async handleRegenerate() {
      await this.handleGenerate();
    },
    handleMovementTypeChange() {
      // 当用户修改运镜类型时，自动保存
      this.handleAutoSave();
    },
    handleDescriptionChange() {
      // 当用户修改运镜描述时，自动保存
      this.handleAutoSave();
    },
    handleAutoSave() {
      // 检查是否有变化
      const movementTypeChanged = this.localMovementType !== this.lastSavedMovementType;
      const descriptionChanged = this.localDescription !== this.lastSavedDescription;

      if (!movementTypeChanged && !descriptionChanged) {
        return;
      }

      // 如果没有 cameraId，说明运镜还未生成，不需要保存
      if (!this.cameraId) {
        return;
      }

      // 构建更新数据
      const data = {};
      if (movementTypeChanged) {
        data.movement_type = this.localMovementType;
      }
      if (descriptionChanged) {
        data.movement_params = {
          ...this.movementParams,
          description: this.localDescription.trim()
        };
      }

      // 触发保存事件
      this.$emit('save', {
        cameraId: this.cameraId,
        data,
        silent: true
      });

      // 更新最后保存的值
      this.lastSavedMovementType = this.localMovementType;
      this.lastSavedDescription = this.localDescription;
    }
  }
};
</script>

<style scoped>
.camera-node {
  width: 250px;
  min-height: 280px;
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

.layout-shell.theme-dark .camera-node {
  background: rgba(15, 23, 42, 0.92);
  border-color: rgba(148, 163, 184, 0.14);
  box-shadow: 0 20px 44px rgba(2, 6, 23, 0.45);
}

.camera-node:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 48px rgba(14, 165, 233, 0.16);
  border-color: rgba(14, 165, 233, 0.18);
}

.layout-shell.theme-dark .camera-node:hover {
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

.node-content {
  padding: 0.85rem 0.9rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.layout-shell.theme-dark .node-content {
  border-bottom-color: rgba(148, 163, 184, 0.16);
}

.content-label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  color: hsl(var(--bc) / 0.6);
  margin-bottom: 0.375rem;
}

.node-description {
  padding: 0.85rem 0.9rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.layout-shell.theme-dark .node-description {
  border-bottom-color: rgba(148, 163, 184, 0.16);
}

.description-textarea {
  font-size: 0.75rem;
  line-height: 1.5;
  color: hsl(var(--bc) / 0.7);
  background: rgba(248, 250, 252, 0.92);
  padding: 0.75rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  width: 100%;
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.layout-shell.theme-dark .description-textarea {
  background: rgba(15, 23, 42, 0.78);
  border-color: rgba(148, 163, 184, 0.12);
  color: hsl(var(--bc) / 0.88);
}

.description-textarea:focus {
  outline: none;
  border-color: hsl(var(--p));
  background: hsl(var(--b1));
}

.layout-shell.theme-dark .description-textarea:focus {
  background: hsl(var(--b2));
}

.description-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

</style>


.node-highlighted {
  animation: node-highlight-pulse 1.4s ease;
}

@keyframes node-highlight-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.45);
    transform: translateY(0);
    border-color: rgba(20, 184, 166, 0.75);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(20, 184, 166, 0.12);
    transform: translateY(-2px);
    border-color: rgba(20, 184, 166, 0.85);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(20, 184, 166, 0);
    transform: translateY(0);
  }
}
