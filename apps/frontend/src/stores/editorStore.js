import { defineStore } from 'pinia';

export const useEditorStore = defineStore('editor', {
  state: () => ({
    activeTool: 'adjust', // 当前激活的一级菜单: adjust | text | draw ...
    isDrawing: false,     // 是否处于画笔/消除模式
    canvasInitialized: false,
  }),
  actions: {
    setActiveTool(tool) {
      this.activeTool = tool;
      // 切换工具时，默认关闭画笔模式，防止逻辑冲突
      this.isDrawing = false; 
    },
    toggleDrawing(status) {
      this.isDrawing = status;
    }
  }
});