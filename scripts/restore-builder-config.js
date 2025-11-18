// scripts/restore-builder-config.js
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const builderYmlPath = path.resolve(__dirname, '../electron-builder.yml');

const builderYml = yaml.load(fs.readFileSync(builderYmlPath, 'utf8'));

// 检查是否有临时存储的原始配置
if (builderYml._originalConfig !== undefined) {
  builderYml.productName = builderYml._originalConfig.productName;
  if (builderYml._originalConfig.win?.icon !== undefined) {
    if (!builderYml.win) {
      builderYml.win = {};
    }
    builderYml.win.icon = builderYml._originalConfig.win.icon;
  } else if (builderYml.win) {
    delete builderYml.win.icon;
    if (Object.keys(builderYml.win).length === 0) {
      delete builderYml.win;
    }
  }
  delete builderYml._originalConfig; // 删除临时字段

  fs.writeFileSync(builderYmlPath, yaml.dump(builderYml, { indent: 2 }));
  console.log(`✅ 已将 electron-builder.yml 中的配置恢复为原始值。`);
} else {
  console.log('ℹ️ 未找到需要恢复的原始配置。');
}