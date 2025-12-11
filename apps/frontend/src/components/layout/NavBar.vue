<template>
  <div class="navbar">
    <div class="logo">大秘美图</div>
    <div class="actions">
      <el-button size="small">撤销</el-button>
      <el-button size="small">重做</el-button>
      <el-button type="primary" size="small">保存 / 导出</el-button>
    </div>
  </div>
</template>

<style scoped>
.navbar {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}
.logo { font-weight: bold; font-size: 16px; color: #333; }
</style>