module.exports = {
  // ... 其他配置
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off', // 允许使用 any
    'no-console': 'off', // 允许使用 console.log
    'prettier/prettier': 'off', // 关闭 prettier 强格式化检查
  },
};