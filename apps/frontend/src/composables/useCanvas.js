import { ref, shallowRef, markRaw, toRaw } from 'vue';
import { fabric } from 'fabric';

export function useCanvas() {
  const canvas = shallowRef(null);
  const cropObject = shallowRef(null); 

  // === 核心限制逻辑：确保裁剪框不超出底图 ===
  const constrainCrop = (activeObj) => {
    if (!canvas.value || !activeObj) return;
    
    // 只有当前操作的是裁剪框时才生效
    const cropRect = toRaw(cropObject.value);
    if (!cropRect || activeObj !== cropRect) return;

    // 找到底图作为边界
    const bgImage = canvas.value.getObjects().find(o => o.type === 'image');
    if (!bgImage) return;

    // 获取底图的边界 (注意：底图可能被缩放过，要用 getScaledWidth)
    const boundLeft = bgImage.left;
    const boundTop = bgImage.top;
    const boundWidth = bgImage.getScaledWidth();
    const boundHeight = bgImage.getScaledHeight();

    // 获取裁剪框的当前状态
    const cropWidth = activeObj.getScaledWidth();
    const cropHeight = activeObj.getScaledHeight();

    // --- 1. 限制缩放 (Scaling) ---
    // 如果裁剪框比底图还大，强制缩小
    if (cropWidth > boundWidth) {
      activeObj.scaleToWidth(boundWidth);
    }
    if (cropHeight > boundHeight) {
      activeObj.scaleToHeight(boundHeight);
    }

    // --- 2. 限制移动 (Moving) ---
    // 重新获取修正后的宽高
    const finalWidth = activeObj.getScaledWidth();
    const finalHeight = activeObj.getScaledHeight();

    // 限制左边
    if (activeObj.left < boundLeft) {
      activeObj.left = boundLeft;
    }
    // 限制上边
    if (activeObj.top < boundTop) {
      activeObj.top = boundTop;
    }
    // 限制右边 (左坐标 + 宽度 > 边界右侧)
    if (activeObj.left + finalWidth > boundLeft + boundWidth) {
      activeObj.left = boundLeft + boundWidth - finalWidth;
    }
    // 限制下边
    if (activeObj.top + finalHeight > boundTop + boundHeight) {
      activeObj.top = boundTop + boundHeight - finalHeight;
    }
  };

  // 初始化 (保留动态宽高)
  const init = (id, width, height) => {
    const c = new fabric.Canvas(id, {
      width: width,
      height: height,
      backgroundColor: null, 
      preserveObjectStacking: true,
    });
    canvas.value = markRaw(c);

    // === 【恢复】绑定事件监听 ===
    // 移动或缩放时，实时触发限制逻辑
    c.on('object:moving', (e) => constrainCrop(e.target));
    c.on('object:scaling', (e) => constrainCrop(e.target));
  };

  const addImage = (url) => {
    fabric.Image.fromURL(url, (img) => {
      // 图片加载逻辑保持不变
      if (canvas.value) {
        const maxWidth = canvas.value.width * 0.8;
        // 如果图片太大，适当缩放
        if (img.width > maxWidth) {
          img.scaleToWidth(maxWidth);
        }
      }
      canvas.value?.add(img);
      canvas.value?.centerObject(img);
      canvas.value?.setActiveObject(img);
    }, { crossOrigin: 'anonymous' });
  };

  // === 裁剪模式 ===
  const startCrop = (aspectRatio = null) => {
    if (!canvas.value) return;
    
    let activeObj = canvas.value.getObjects().find(obj => obj.type === 'image');
    if (!activeObj) return;

    cancelCrop(); 

    const imgWidth = activeObj.getScaledWidth();
    const imgHeight = activeObj.getScaledHeight();
    
    // 初始裁剪框大小 (默认80%)
    let width = imgWidth * 0.8;
    let height = imgHeight * 0.8;

    if (aspectRatio) {
      height = width / aspectRatio;
      // 必须保证初始框不超出图片
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
      fill: 'rgba(0,0,0,0.3)', 
      stroke: '#409eff',
      strokeWidth: 2,
      cornerColor: 'white',
      cornerStrokeColor: '#409eff',
      cornerSize: 10,
      transparentCorners: false,
      lockRotation: true,
      hasRotatingPoint: false,
    });

    if (aspectRatio) {
      cropZone.set({ lockUniScaling: true });
      cropZone.set('height', width / aspectRatio);
    } else {
      cropZone.set({ lockUniScaling: false });
    }

    canvas.value.add(cropZone);
    canvas.value.setActiveObject(cropZone);
    cropObject.value = cropZone; 
    canvas.value.renderAll();
  };

  const setCropBoxSize = (width, height) => {
    if (!cropObject.value || !canvas.value) return;
    // 这里也可以加个 check 防止输入过大
    cropObject.value.set({ width, height });
    cropObject.value.setCoords(); 
    // 手动触发一次限制检查，防止输入的数字超界
    constrainCrop(toRaw(cropObject.value));
    canvas.value.renderAll();
  };

  // === 确认裁剪 ===
  const confirmCrop = () => {
    if (!canvas.value || !cropObject.value) return;
    
    const cropRect = cropObject.value;
    const bgImage = canvas.value.getObjects().find(o => o.type === 'image');
    if (!bgImage) return cancelCrop();

    // 1. 隐藏裁剪框
    cropRect.visible = false; 

    // 2. 截图
    // 这里的 left/top 是相对于 Canvas 的绝对坐标
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
      const rawObj = toRaw(cropObject.value);
      canvas.value.remove(rawObj);
      cropObject.value = null;
      canvas.value.renderAll();
    }
  };

  // ... 其他方法 (rotate, flip, AI 等) 保持不变，直接复制即可
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

  const resizeCanvas = (w, h) => {
    if (canvas.value) {
      canvas.value.setDimensions({ width: w, height: h });
    }
  }

  return { 
    canvas, init, addImage, 
    startCrop, setCropBoxSize, confirmCrop, cancelCrop, 
    rotateActive, flipActive,
    toggleDrawing, exportMask, replaceActiveImage, addText,
    resizeCanvas
  };
}