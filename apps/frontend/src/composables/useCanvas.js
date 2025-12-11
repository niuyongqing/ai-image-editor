import { ref, shallowRef, markRaw, toRaw } from 'vue';
import { fabric } from 'fabric';

export function useCanvas() {
  // 使用 shallowRef 避免 Vue 深度代理导致 Fabric 对象移除失败
  const canvas = shallowRef(null);
  const cropObject = shallowRef(null); 

  // === 核心限制逻辑：确保裁剪框不超出底图 ===
  const constrainCrop = (activeObj) => {
    if (!canvas.value || !activeObj) return;
    
    // 只有当前操作的是裁剪框时才生效
    // 注意：这里比较的是原始对象，所以需要 toRaw
    const cropRect = toRaw(cropObject.value);
    if (!cropRect || activeObj !== cropRect) return;

    // 找到底图作为边界
    const bgImage = canvas.value.getObjects().find(o => o.type === 'image');
    if (!bgImage) return;

    // 获取底图的边界 (考虑缩放，但不考虑旋转，裁剪通常在正向图片上进行)
    const bgWidth = bgImage.getScaledWidth();
    const bgHeight = bgImage.getScaledHeight();
    const bgLeft = bgImage.left;
    const bgTop = bgImage.top;

    // 获取裁剪框的当前状态
    let top = activeObj.top;
    let left = activeObj.left;
    const scaleX = activeObj.scaleX;
    const scaleY = activeObj.scaleY;
    const width = activeObj.width * scaleX;
    const height = activeObj.height * scaleY;

    // --- 1. 限制移动 (Moving) ---
    // 限制左边
    if (left < bgLeft) activeObj.set('left', bgLeft);
    // 限制上边
    if (top < bgTop) activeObj.set('top', bgTop);
    // 限制右边 (左坐标 + 宽度 > 背景右边界)
    if (left + width > bgLeft + bgWidth) activeObj.set('left', bgLeft + bgWidth - width);
    // 限制下边
    if (top + height > bgTop + bgHeight) activeObj.set('top', bgTop + bgHeight - height);

    // --- 2. 限制缩放 (Scaling) ---
    // 如果缩放导致宽高超过了底图，强制修正 scale
    // 注意：这只是一个简单的防溢出，完美缩放限制需要更复杂的数学计算
    const currentWidth = activeObj.getScaledWidth();
    const currentHeight = activeObj.getScaledHeight();

    if (currentWidth > bgWidth) activeObj.scaleToWidth(bgWidth);
    if (currentHeight > bgHeight) activeObj.scaleToHeight(bgHeight);
    
    // 二次检查位置（防止缩放后位置偏移出界）
    if (activeObj.left < bgLeft) activeObj.set('left', bgLeft);
    if (activeObj.top < bgTop) activeObj.set('top', bgTop);
  };

  // 初始化
  const init = (id, width, height) => {
    const c = new fabric.Canvas(id, {
      width: width,
      height: height,
      backgroundColor: '#f3f3f3',
      preserveObjectStacking: true,
    });
    canvas.value = markRaw(c);

    // === 绑定事件监听 ===
    // 在移动和缩放时触发限制逻辑
    c.on('object:moving', (e) => constrainCrop(e.target));
    c.on('object:scaling', (e) => constrainCrop(e.target));
  };

  const addImage = (url) => {
    fabric.Image.fromURL(url, (img) => {
      if (img.width > 800) img.scaleToWidth(800);
      canvas.value?.add(img);
      canvas.value?.centerObject(img);
      canvas.value?.setActiveObject(img);
    }, { crossOrigin: 'anonymous' });
  };

  // === 裁剪模式 ===
  const startCrop = (aspectRatio = null) => {
    if (!canvas.value) return;
    
    // 1. 查找底图 (确保是对图片进行裁剪)
    let activeObj = canvas.value.getObjects().find(obj => obj.type === 'image');
    if (!activeObj) return;

    cancelCrop(); // 移除旧框

    // 2. 初始裁剪框大小 (默认80%)
    const imgWidth = activeObj.getScaledWidth();
    const imgHeight = activeObj.getScaledHeight();
    let width = imgWidth * 0.8;
    let height = imgHeight * 0.8;

    if (aspectRatio) {
      height = width / aspectRatio;
      // 如果算出高度溢出，改用高度基准
      if (height > imgHeight) {
        height = imgHeight;
        width = height * aspectRatio;
      }
    }

    const cropZone = new fabric.Rect({
      left: activeObj.left + (imgWidth - width) / 2,
      top: activeObj.top + (imgHeight - height) / 2,
      width: width,
      height: height,
      fill: 'rgba(0,0,0,0.3)', // 半透明蒙版
      stroke: '#409eff',
      strokeWidth: 2,
      cornerColor: 'white',
      cornerStrokeColor: '#409eff',
      cornerSize: 10,
      transparentCorners: false,
      lockRotation: true, // 裁剪框不旋转
      hasRotatingPoint: false,
    });

    if (aspectRatio) {
      cropZone.set({ lockUniScaling: true });
      // 修正：使用 set 设定高度
      cropZone.set('height', width / aspectRatio);
    } else {
      cropZone.set({ lockUniScaling: false });
    }

    canvas.value.add(cropZone);
    canvas.value.setActiveObject(cropZone);
    cropObject.value = cropZone; // shallowRef 存储原始对象
    canvas.value.renderAll();
  };

  const setCropBoxSize = (width, height) => {
    if (!cropObject.value || !canvas.value) return;
    // 简单设置，实际建议也加一层 constrainCheck 防止输入过大
    cropObject.value.set({ width, height });
    cropObject.value.setCoords(); 
    canvas.value.renderAll();
  };

  // === 确认裁剪 (含蒙版修复) ===
  const confirmCrop = () => {
    if (!canvas.value || !cropObject.value) return;
    
    const cropRect = cropObject.value;
    const bgImage = canvas.value.getObjects().find(o => o.type === 'image');
    if (!bgImage) return cancelCrop();

    // 1. 关键修复：截图前隐藏裁剪框，防止截图变灰
    cropRect.visible = false; 

    // 2. 截图
    const croppedDataUrl = canvas.value.toDataURL({
      left: cropRect.left,
      top: cropRect.top,
      width: cropRect.getScaledWidth(),
      height: cropRect.getScaledHeight(),
      format: 'png',
      multiplier: 1
    });

    // 3. 替换原图
    bgImage.setSrc(croppedDataUrl, () => {
      bgImage.set({
        left: cropRect.left,
        top: cropRect.top,
        scaleX: 1, 
        scaleY: 1,
        width: cropRect.getScaledWidth(),
        height: cropRect.getScaledHeight()
      });
      
      cancelCrop();
      canvas.value.renderAll();
    });
  };

  const cancelCrop = () => {
    if (canvas.value && cropObject.value) {
      // 使用 toRaw 确保移除的是原始对象
      const rawObj = toRaw(cropObject.value);
      canvas.value.remove(rawObj);
      cropObject.value = null;
      canvas.value.renderAll();
    }
  };

  // === 其他功能 ===
  const rotateActive = (angle) => {
    const activeObj = canvas.value?.getActiveObject();
    if (activeObj) {
      activeObj.rotate((activeObj.angle || 0) + angle);
      canvas.value.requestRenderAll();
    }
  };

  const flipActive = (axis) => {
    const activeObj = canvas.value?.getActiveObject();
    if (activeObj) {
      if (axis === 'X') activeObj.set('flipX', !activeObj.flipX);
      if (axis === 'Y') activeObj.set('flipY', !activeObj.flipY);
      canvas.value.requestRenderAll();
    }
  };

  const toggleDrawing = (enable) => {
    if (!canvas.value) return;
    canvas.value.isDrawingMode = enable;
    if (enable) {
      const brush = new fabric.PencilBrush(canvas.value);
      brush.color = 'rgba(255, 0, 0, 0.5)';
      brush.width = 30;
      canvas.value.freeDrawingBrush = brush;
    }
  };

  const exportMask = () => {
    if (!canvas.value) return null;
    const originalBg = canvas.value.backgroundColor;
    const objects = canvas.value.getObjects();

    objects.forEach(obj => {
      if (obj.type === 'path') {
        obj._originalStroke = obj.stroke;
        obj.set({ stroke: '#ffffff' });
      } else {
        obj._originalOpacity = obj.opacity;
        obj.set({ opacity: 0 });
      }
    });
    canvas.value.setBackgroundColor('#000000', null);
    canvas.value.renderAll();

    const dataURL = canvas.value.toDataURL({ format: 'png', multiplier: 1 });

    objects.forEach(obj => {
      if (obj.type === 'path') {
        obj.set({ stroke: obj._originalStroke || 'rgba(255, 0, 0, 0.5)' });
      } else {
        obj.set({ opacity: obj._originalOpacity ?? 1 });
      }
    });
    canvas.value.setBackgroundColor(originalBg, null);
    canvas.value.renderAll();

    return dataURL;
  };

  const replaceActiveImage = (newUrl) => {
    const activeObj = canvas.value?.getActiveObject();
    if (!activeObj || activeObj.type !== 'image') return;
    activeObj.setSrc(newUrl, () => {
      canvas.value.renderAll();
    }, { crossOrigin: 'anonymous' });
  };

  const addText = (textStr = '双击编辑') => {
    if (!canvas.value) return;
    const text = new fabric.IText(textStr, {
      left: 100, top: 100, fontSize: 40, fill: '#333'
    });
    canvas.value.add(text);
    canvas.value.setActiveObject(text);
  };

  return { 
    canvas, init, addImage, 
    startCrop, setCropBoxSize, confirmCrop, cancelCrop, 
    rotateActive, flipActive,
    toggleDrawing, exportMask, replaceActiveImage, addText
  };
}