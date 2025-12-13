<template>
  <div class="tool-group">
    <div class="tool-item" @click="handleRembg">
      <div class="left">
        <el-icon><Scissor /></el-icon>
        <span>一键抠图</span>
      </div>
      
      <div class="right-icon">
        <el-icon v-if="loading" class="is-loading"><Loading /></el-icon>
        <el-icon v-else class="arrow"><ArrowRight /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue';
import { Scissor, ArrowRight, Loading } from '@element-plus/icons-vue';
import { aiApi } from '@/api/ai';
import { ElMessage } from 'element-plus';

const canvasAPI = inject('canvasAPI');
const loading = ref(false);

const handleRembg = async () => {
  const activeObj = canvasAPI?.canvas.value?.getActiveObject();
  if (!activeObj || activeObj.type !== 'image') return ElMessage.warning('请先选中图片');
  
  loading.value = true;
  try {
    const src = activeObj.getSrc();
    const blob = await (await fetch(src)).blob();
    const newUrl = await aiApi.removeBackground(new File([blob], "img.png"));
    canvasAPI.replaceActiveImage(newUrl);
    ElMessage.success('抠图完成');
  } catch(e) {
    console.error(e);
    ElMessage.error('抠图失败');
  } finally {
    loading.value = false;
  }
};
</script>