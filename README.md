## 介绍
Electron启动器, 用来下载Node项目并运行. 支持自动更新.
框架使用的是[electron-vite](https://cn.electron-vite.org/guide/introduction.html)
自动更新服务提供: [UpgradeLink](http://upgrade.toolsetlink.com/)
## 使用
Nuxt或Next全栈项目开发后, 打包并构建. 然后把构建物上传到UpgradeLink的文件升级服务中.
根据环境变量配置应用的信息.
## 配置
根据.env.example设置应用的信息, 配置如下:
```
VITE_UL_CONF_AK=UpgradeLink的AK
VITE_UL_CONF_SK=UpgradeLinkSK
VITE_UL_CONF_FILEKEY=UpgradeLink的FileKey(文件升级)
VITE_UL_CONF_URL=启动项目后要打开的地址(默认http://localhost:3000)
VITE_APP_NAME=应用名
VITE_APP_DESC=应用描述
VITE_APP_ID=com.electron.app
VITE_APP_ICON=应用的图标和icon,如:image/app.png
VITE_APP_HOME=应用主页
VITE_APP_LINKS=应用的相关链接,如: 使用文档|https://链接1|😁;视频教程|https://链接2|😗;讨论区|链接3
VITE_AUTHOR_NAME=作者名
VITE_AUTHOR_WX=作者微信
VITE_AUTHOR_WX_IMG=微信二维码,如:image/wx.png
VITE_AUTHOR_EMAIL=邮箱
VITE_ADMIN_PASSWORD=打开开发者工具的密码, 默认admin123

```

### 设置图标
图标获取可以谷歌搜: 软件名 logo circle png .我用的: https://www.vecteezy.com/png

需要注意的是,VITE_APP_ICON和VITE_AUTHOR_WX_IMG对应的图片最好在<rootDiv>/resources下和<rootDir>/src/renderer/src/assets下各有一份.
变量值请不要以/开头, 直接写对应路径

原因请看: https://cn.electron-vite.org/guide/assets

相关代码: Home.vue的logoIconUrl() About.vue的qrCodeUrl()
AI写的

## 打包
pnpm build:win 打包windows下的安装包
"build:win:mode": "node scripts/build-with-mode.js shein win"
打包.env.shein的环境变量. 会在打包前执行scripts/build-with-mode.js替换electron-builder.yml的部分字段然后打包成zip包
相关的配置在electron-builder.yml中.默认打包为zip压缩包. 下载后解压即可使用

compression: maximum会花费很长时间构建(比normal多3倍的时间), 但打包后的zip包大小没变化
## 打包后
1. 删除了多余的语言
scripts/cleanup-locales.js