// 构建前替换变量名称

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const builderYmlPath = path.resolve(__dirname, '../electron-builder.yml');
const appName = process.env.VITE_APP_NAME;
const appIcon = process.env.VITE_APP_ICON;
console.log(process.env);

if (!appName || !appIcon) {
  console.warn('警告：未在 .env 文件中找到 VITE_APP_NAME 或 VITE_APP_ICON 环境变量。');
  process.exit(0);
}

// 读取 electron-builder.yml
const builderYml = yaml.load(fs.readFileSync(builderYmlPath, 'utf8'));

// 保存原始配置，以便后续恢复
const originalConfig = {
  productName: builderYml.productName,
  win: {
    icon: builderYml.win?.icon
  }
};
builderYml._originalConfig = originalConfig; // 临时存储在一个新字段

// 修改 productName 和 win.icon
builderYml.productName = appName;
if (!builderYml.win) {
  builderYml.win = {};
}
builderYml.win.icon = appIcon;

// 写回 electron-builder.yml
fs.writeFileSync(builderYmlPath, yaml.dump(builderYml, { indent: 2 }));

console.log(`✅ 已将 electron-builder.yml 中的 productName 设置为: ${appName}`);
console.log(`✅ 已将 electron-builder.yml 中的 win.icon 设置为: ${appIcon}`);