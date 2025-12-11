import { ref, markRaw } from 'vue';
import { fabric } from 'fabric';

export function useCanvas() {
  const canvas = ref(null);

  // 初始化
  const init = (id) => {
    const c = new fabric.Canvas(id, {
      width: 800,
      height: 600,
      backgroundColor: '#f3f3f3',
      isDrawingMode: false
    });
    // markRaw 避免 Vue 深度监听 fabric 对象导致性能卡顿
    canvas.value = markRaw(c); 
  };

  // 添加图片
  const addImage = (url) => {
    fabric.Image.fromURL(url, (img) => {
      canvas.value?.add(img);
      canvas.value?.centerObject(img);
      canvas.value?.setActiveObject(img);
    }, { crossOrigin: 'anonymous' }); // 解决跨域
  };

  // 开启/关闭 画笔 (生成蒙版用)
  const toggleDrawing = (enable) => {
    if (!canvas.value) return;
    canvas.value.isDrawingMode = enable;
    if (enable) {
      canvas.value.freeDrawingBrush = new fabric.PencilBrush(canvas.value);
      canvas.value.freeDrawingBrush.color = 'black'; // 蒙版颜色通常是黑或白
      canvas.value.freeDrawingBrush.width = 20;
    }
  };

  return { canvas, init, addImage, toggleDrawing };
}