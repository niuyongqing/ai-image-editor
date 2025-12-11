<template>
  <div class="editor">
    <div class="toolbar">
      <button @click="handleUpload">上传图片</button>
      <button @click="handleRembg">🤖 一键抠图 (本地)</button>
      <button @click="toggleInpaintMode">
        {{ isDrawing ? '取消涂抹' : '🖌️ 消除笔 (云端)' }}
      </button>
      <button v-if="isDrawing" @click="confirmInpaint" class="confirm-btn">
        确认消除
      </button>
    </div>
    
    <div class="canvas-wrapper" v-loading="loading">
      <canvas id="c"></canvas>
    </div>
    
    <input type="file" ref="fileInput" @change="onFileSelected" style="display:none" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useCanvas } from './../composables/useCanvas.js';
import { aiApi } from '../api/ai/index.js';

const { canvas, init, addImage, toggleDrawing } = useCanvas();
const fileInput = ref(null);
const loading = ref(false);
const isDrawing = ref(false);

onMounted(() => init('c'));

// 1. 上传图片逻辑
const handleUpload = () => fileInput.value?.click();

const onFileSelected = (e) => {
  // JS 写法：直接获取 files，不需要类型断言
  const file = e.target.files && e.target.files[0];
  if (file) addImage(URL.createObjectURL(file));
};

// 2. 抠图逻辑
const handleRembg = async () => {
  const activeObj = canvas.value?.getActiveObject();
  if (!activeObj || activeObj.type !== 'image') return alert('请先选中图片');

  loading.value = true;
  try {
    // 获取原图 URL
    const src = activeObj.getSrc();
    const blob = await (await fetch(src)).blob();
    const file = new File([blob], "image.png");

    // 调用 NestJS 本地抠图
    const newUrl = await aiApi.removeBackground(file);
    
    // 替换画布图片
    activeObj.setSrc(newUrl, () => {
      canvas.value?.renderAll();
      loading.value = false;
    });
  } catch (e) {
    console.error(e);
    alert('抠图失败，请检查后端服务');
    loading.value = false;
  }
};

// 3. 消除笔逻辑
const toggleInpaintMode = () => {
  isDrawing.value = !isDrawing.value;
  toggleDrawing(isDrawing.value);
};

const confirmInpaint = async () => {
  if (!canvas.value) return;
  loading.value = true;
  isDrawing.value = false;
  toggleDrawing(false);

  // 3.1 导出整个画布作为“原图”
  const imageBase64 = canvas.value.toDataURL({ format: 'png' });
  const imageBlob = await (await fetch(imageBase64)).blob();

  // 3.2 导出蒙版 (这里简单复用原图逻辑，实际建议专门导出 mask)
  const maskBlob = imageBlob; 

  try {
    const newUrl = await aiApi.inpaint(imageBlob, maskBlob);
    // 清空画布重新加载结果图
    canvas.value.clear();
    addImage(newUrl);
  } catch (e) {
    console.error(e);
    alert('消除失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.editor { display: flex; flex-direction: column; height: 100vh; }
.toolbar { padding: 10px; background: #333; display: flex; gap: 10px; }
.canvas-wrapper { flex: 1; display: flex; justify-content: center; align-items: center; background: #eee; }
button { padding: 8px 15px; cursor: pointer; }
.confirm-btn { background: #409eff; color: white; border: none; }
</style>