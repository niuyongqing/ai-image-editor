<template>
  <div class="tool-group">
    <div 
      class="tool-item" 
      :class="{ 'is-expanded': isExpanded }"
      @click="handleToggle"
    >
      <div class="left">
        <el-icon><Crop /></el-icon>
        <span>裁剪/旋转</span>
      </div>
      <div class="right-icon">
        <el-icon class="arrow"><ArrowRight /></el-icon>
      </div>
    </div>

    <div v-if="isExpanded" class="tool-content">
      
      <div class="ratio-grid">
        <div class="ratio-item" @click="resetCrop">
          <div class="icon-box"><el-icon><RefreshLeft /></el-icon></div>
          <span>初始化</span>
        </div>
        
        <div class="ratio-item" :class="{active: currentRatio === 'original'}" @click="startCrop(null, true)">
          <div class="shape-rect" style="width: 14px; height: 14px; border:1px solid #666"></div>
          <span>原比例</span>
        </div>

        <div class="ratio-item" :class="{active: currentRatio === 'free'}" @click="startCrop(null)">
          <div class="shape-rect dashed"></div>
          <span>自由比例</span>
        </div>

        <div class="ratio-item" :class="{active: currentRatio === 1}" @click="startCrop(1)">
          <div class="shape-rect square"></div>
          <span>1:1</span>
        </div>

        <div class="ratio-item" :class="{active: currentRatio === 4/3}" @click="startCrop(4/3)">
          <div class="shape-rect" style="width: 16px; height: 12px;"></div>
          <span>4:3</span>
        </div>
        
        <div class="ratio-item" :class="{active: currentRatio === 16/9}" @click="startCrop(16/9)">
          <div class="shape-rect rect-h"></div>
          <span>16:9</span>
        </div>
      </div>

      <div class="custom-size-box">
        <div class="input-row">
          <el-input-number 
            v-model="cropW" :controls="false" size="small" class="size-input" @change="updateCropSize"
          ><template #suffix>W</template></el-input-number>
          <div class="link-icon"><el-icon><Link /></el-icon></div>
          <el-input-number 
            v-model="cropH" :controls="false" size="small" class="size-input" @change="updateCropSize"
          ><template #suffix>H</template></el-input-number>
        </div>
      </div>

      <div class="rotate-actions">
        <el-tooltip content="向左旋转90°" placement="top">
          <div class="action-btn" @click="rotate(-90)"><el-icon><RefreshLeft /></el-icon></div>
        </el-tooltip>
        <el-tooltip content="向右旋转90°" placement="top">
          <div class="action-btn" @click="rotate(90)"><el-icon><RefreshRight /></el-icon></div>
        </el-tooltip>
        <div class="divider"></div>
        <el-tooltip content="水平翻转" placement="top">
          <div class="action-btn" @click="flip('X')"><el-icon><Switch /></el-icon></div>
        </el-tooltip>
        <el-tooltip content="垂直翻转" placement="top">
          <div class="action-btn" @click="flip('Y')"><el-icon><Sort /></el-icon></div>
        </el-tooltip>
      </div>

      <div class="confirm-row">
        <el-button type="primary" class="full-btn" @click="applyCrop">应用</el-button>
        <el-button class="full-btn" @click="cancelCrop">取消</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, watch, onMounted, onUnmounted } from 'vue';
import { 
  Crop, ArrowRight, RefreshLeft, RefreshRight, Link, Switch, Sort 
} from '@element-plus/icons-vue';

// === 1. 接收父组件的展开状态 ===
const props = defineProps({
  isExpanded: {
    type: Boolean,
    default: false
  }
});
const emit = defineEmits(['toggle']);

const canvasAPI = inject('canvasAPI');
const currentRatio = ref('free');
const cropW = ref(1000);
const cropH = ref(1000);

// === 2. 核心改动：监听展开状态 ===
// 以前是在 onMounted 里直接 startCrop，现在要在展开时才 startCrop
watch(() => props.isExpanded, (val) => {
  if (val) {
    // 展开面板 -> 开启自由比例裁剪
    // 稍微延迟一点，确保 content 渲染完毕
    setTimeout(() => startCrop(null), 50);
  } else {
    // 收起面板 -> 取消裁剪
    canvasAPI?.cancelCrop();
  }
});

const handleToggle = () => {
  emit('toggle');
};

// === 下面的业务逻辑保持原样 ===

const startCrop = (ratio, isOriginal = false) => {
  currentRatio.value = ratio;
  if (ratio === null && !isOriginal) currentRatio.value = 'free';
  if (isOriginal) currentRatio.value = 'original';

  if (!canvasAPI) return;

  let targetRatio = ratio;
  if (isOriginal) {
    const activeObj = canvasAPI.canvas.value?.getObjects().find(o => o.type === 'image');
    if (activeObj) {
      targetRatio = activeObj.width / activeObj.height;
    }
  }
  canvasAPI.startCrop(targetRatio);
  updateInputFromCanvas();
};

const updateCropSize = () => {
  if (canvasAPI?.setCropBoxSize) {
    canvasAPI.setCropBoxSize(cropW.value, cropH.value);
  }
};

const updateInputFromCanvas = () => {
  const cropObj = canvasAPI.canvas.value?.getObjects().find(o => o.type === 'rect');
  if (cropObj) {
    cropW.value = Math.round(cropObj.width * cropObj.scaleX);
    cropH.value = Math.round(cropObj.height * cropObj.scaleY);
  }
};

const resetCrop = () => startCrop(null);

const applyCrop = () => {
  canvasAPI?.confirmCrop();
  emit('toggle'); // 应用后自动收起
};

const cancelCrop = () => {
  canvasAPI?.cancelCrop();
  emit('toggle'); // 取消后自动收起
};

const rotate = (angle) => {
  canvasAPI?.rotateActive(angle);
  setTimeout(() => updateInputFromCanvas(), 50);
};

const flip = (axis) => {
  canvasAPI?.flipActive(axis);
};

// 保持事件监听以同步输入框
onMounted(() => {
  canvasAPI.canvas.value?.on('object:scaling', updateInputFromCanvas);
  canvasAPI.canvas.value?.on('object:modified', updateInputFromCanvas);
  
  // 如果组件加载时已经是展开状态（极其少见，但为了健壮性），也启动裁剪
  if (props.isExpanded) {
    startCrop(null);
  }
});

onUnmounted(() => {
  canvasAPI.canvas.value?.off('object:scaling', updateInputFromCanvas);
  canvasAPI.canvas.value?.off('object:modified', updateInputFromCanvas);
});
</script>

<style scoped>
/* 组件内部私有样式 - 用于微调内容区 */
/* 注意：tool-group, tool-item 等外框样式已在全局 style.css 中定义，这里不需要写 */

.ratio-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.ratio-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 4px;
  border: 1px solid #f2f2f2;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  background: #fff;
  transition: all 0.2s;
  height: 60px;
}

.ratio-item:hover { background-color: #f9f9f9; border-color: #dcdfe6; }
.ratio-item.active { border-color: #409eff; color: #409eff; background-color: #ecf5ff; }

/* 图标辅助样式 */
.icon-box { font-size: 16px; margin-bottom: 6px; }
.shape-rect { border: 1px solid currentColor; margin-bottom: 6px; box-sizing: border-box; }
.shape-rect.dashed { border-style: dashed; width: 14px; height: 14px; }
.shape-rect.square { width: 14px; height: 14px; }
.shape-rect.rect-h { width: 18px; height: 10px; }

.custom-size-box { margin-bottom: 16px; padding: 10px; background-color: #f8f9fa; border-radius: 6px; }
.input-row { display: flex; align-items: center; justify-content: space-between; }
.size-input { width: 45%; }
.link-icon { color: #909399; cursor: pointer; }

.rotate-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 10px; }
.action-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; color: #606266; font-size: 18px; background-color: #f5f7fa; transition: all 0.2s; }
.action-btn:hover { background-color: #e6e8eb; color: #333; }
.divider { width: 1px; height: 20px; background-color: #eee; }

.confirm-row { display: flex; gap: 10px; }
.full-btn { flex: 1; }
</style>