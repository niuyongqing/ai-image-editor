<template>
  <div class="tool-panel">
    <component :is="currentModule" />
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue';
import { useEditorStore } from '../../stores/editorStore';

const store = useEditorStore();

// 动态映射表：将 activeTool 的 ID 映射到组件路径
const modules = {
  adjust: defineAsyncComponent(() => import('../modules/adjust/index.vue')),
  draw: defineAsyncComponent(() => import('../modules/draw/index.vue')),
  text: defineAsyncComponent(() => import('../modules/text/index.vue')),
  border: defineAsyncComponent(() => import('../modules/border/index.vue')),
  material: defineAsyncComponent(() => import('../modules/material/index.vue')),
  watermark: defineAsyncComponent(() => import('../modules/watermark/index.vue')),
  puzzle: defineAsyncComponent(() => import('../modules/puzzle/index.vue')),
  ai: defineAsyncComponent(() => import('../modules/ai/index.vue')),
};

const currentModule = computed(() => {
  return modules[store.activeTool] || modules['adjust']; // 默认显示 adjust
});
</script>

<style scoped>
.tool-panel {
  background: #fff;
  border-right: 1px solid #e4e7ed;
  height: 100%;
  overflow-y: auto;
}
</style>