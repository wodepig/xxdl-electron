import { join, dirname } from 'path'
import { app, dialog, shell } from 'electron'
import { autoUpdater } from "electron-updater"
import { getConfValue, setConfValue, getEnvConf } from './config'
import { getElectronUpgrade } from '../ulUtils'
//@ts-ignore
import { is } from '@electron-toolkit/utils'

// 检查electron更新
export const checkElectronUpdrate = async () =>{
    const result = await downUpdate()
}

// 检查更新
export const checkForUpdates = async () =>{
    //  const appVersion = getConfValue('appVersion', '1.0.0')
     const appVersion = app.getVersion()
   try {
    if (!app.isPackaged) { 
    Object.defineProperty(app, 'isPackaged', { 
        get: () => true, 
    }); 
}
console.log('app_ver',app.getVersion());

    autoUpdater.updateConfigPath = join(getAppDir(), "dev-update.yml")
   
    // 打印相关参数
    console.log('当前启动器版本号:', appVersion);
    const electronKey = getEnvConf('VITE_UL_CONF_APP_ELKEY')
     const ak = getEnvConf('VITE_UL_CONF_APP_AK')
      const sk = getEnvConf('VITE_UL_CONF_APP_SK')
    console.log('electron更新密钥:', electronKey);
    if(!electronKey){
      return {
        error: '未配置electron更新密钥',
        currentVersion: appVersion
      };
    }
    console.log('当前启动器版本号:', appVersion);
    const platform = 'windows'
    const arch = 'x64' 
        const FeedURL = `https://api.upgrade.toolsetlink.com/v1/electron/upgrade?electronKey=${electronKey}&versionName=${appVersion}&appointVersionName=&devModelKey=&devKey=&platform=${platform}&arch=${arch}`;
    autoUpdater.setFeedURL({
      url: FeedURL,
      provider: 'generic',
    });
    autoUpdater.requestHeaders = {
      'X-AccessKey': ak,
    };

    const result = await autoUpdater.checkForUpdates();
    // 打印返回结果
    console.log("result: ",result);

    if (!result || !result.updateInfo) {
      // 接口调用失败
      return {
        error: "无法获取更新信息",
        currentVersion: appVersion
      };
    } else if (result.updateInfo.version === appVersion) {
      // 返回的版本号与当前一直，则代表当前为最新版本
      return {
        updateAvailable: false,
        currentVersion: appVersion
      };
    } else if (result.updateInfo.version) {
      return {
        updateAvailable: true,
        currentVersion: appVersion,
        newVersion: result.updateInfo.version
      };
    }

    return {
      updateAvailable: false,
      currentVersion: appVersion
    };
  } catch (error) {
    if (error.code === 'ETIMEDOUT') {
      return { error: '网络请求超时，请检查网络连接', currentVersion: appVersion };
    }
    return {
      error: error.message,
      currentVersion: appVersion
    };
  } 
}

const downUpdate = async () =>{
     const appVersion = app.getVersion()
    try {
    if (!app.isPackaged) { 
    Object.defineProperty(app, 'isPackaged', { 
        get: () => true, 
    }); 
}
    // autoUpdater.updateConfigPath = join(getAppDir(), "dev-update.yml")
   
    // 打印相关参数
    console.log('当前启动器版本号:', appVersion);
    const electronKey = getEnvConf('VITE_UL_CONF_APP_ELKEY')
     const ak = getEnvConf('VITE_UL_CONF_APP_AK')
      const sk = getEnvConf('VITE_UL_CONF_APP_SK')
    console.log('electron_key:', electronKey);
        console.log('ak:', ak);
        console.log('sk:', sk);
    if(!electronKey){
      return {
        error: '未配置electron更新密钥',
        currentVersion: appVersion
      };
    }
    console.log('当前启动器版本号:', appVersion);
    const platform = 'windows'
    const arch = 'x64' 
        const FeedURL = `https://api.upgrade.toolsetlink.com/v1/electron/upgrade?electronKey=${electronKey}&versionName=${appVersion}&appointVersionName=&devModelKey=&devKey=&platform=${platform}&arch=${arch}`;
    console.log('FeedURL:', FeedURL);
    
        autoUpdater.setFeedURL({
      url: FeedURL,
      provider: 'generic',
    });
    autoUpdater.requestHeaders = {
      'X-AccessKey': ak,
    };

    const result = await autoUpdater.checkForUpdates();

    // 打印返回结果
    console.log('result响应',result);

    autoUpdater.setFeedURL({
      url: result.updateInfo.path,
      provider: 'generic',
    });
    console.log('[流程] 下载更新开始，URL:', result.updateInfo.path);
    try {
      await autoUpdater.downloadUpdate();
      autoUpdater.quitAndInstall();
      console.log('[流程] 下载更新完成');
    } catch (e) {
      console.error('[流程] 下载更新失败:', e);
      console.error('[DEBUG] 错误堆栈:', e.stack);
      throw e;
    }


    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
// 添加下载进度事件监听
autoUpdater.on('download-progress', (progressObj) => {
    console.log({
    percent: progressObj.percent,
    transferred: progressObj.transferred,
    total: progressObj.total
  });
    

//   mainWindow.webContents.send('download-progress', {
//     percent: progressObj.percent,
//     transferred: progressObj.transferred,
//     total: progressObj.total
//   });
});
autoUpdater.on('error', (error) => {
//   mainWindow.webContents.send('update-error', error.message);
console.error('[DEBUG] 错误堆栈:', error.stack);
});
// 获取程序运行目录
export const getAppDir = (): string => {
  if (is.dev) {
    return join(__dirname, '../../../')
  }
  return join(app.getAppPath(), '../../')
}