const { default: Client, Config, FileUpgradeRequest, AppReportRequest, ElectronVersionRequest } = require('@toolsetlink/upgradelink-api-typescript');

/**
 * UpgradeLink API 响应数据类型
 */
export interface UpgradeResponse {
  code: number
  msg: string
  data: {
    fileKey?: string
    versionName?: string
    versionCode?: number
    urlPath?: string
    upgradeType?: number
    promptUpgradeContent?: string
    [key: string]: any
  }
}

/**
 * 获取 Electron 应用升级信息
 * @param ak AccessKey
 * @param sk AccessSecret
 * @param electronKey Electron 应用密钥
 * @param versionCode 当前版本号
 * @returns 升级信息响应
 */
export async function getElectronUpgrade(
  ak: string,
  sk: string,
  electronKey: string,
  versionCode: number = 1
): Promise<UpgradeResponse | null> {
  try {
    const config = new Config({
      accessKey: ak,
      accessSecret: sk,
    });
    const client = new Client(config);

    const request = new ElectronVersionRequest({
      electronKey: electronKey,
      versionName: '1.1.1' + '',
      platform: "windows",
      arch: "x64"
    });

    console.log('ak', ak);
    console.log('sk', sk);
    console.log('electronKey', electronKey);
    console.log('versionCode', versionCode);
    console.log('request', request);

    const response = await client.ElectronVersion(request);

    console.log('\nelectron升级信息响应:');
    console.log(`code: ${response.code}`);
    console.log(`msg: ${response.msg}`);
    console.log('data:');
    console.log(response);

    return response as UpgradeResponse;
  } catch (error) {
    console.error('\n获取electron升级信息失败:', error);
    return null;
  }
}

/**
 * 获取文件升级信息
 * @param ak AccessKey
 * @param sk AccessSecret
 * @param fk FileKey
 * @param versionCode 当前版本号
 * @returns 升级信息响应
 */
export async function getFileUpgrade(
  ak: string,
  sk: string,
  fk: string,
  versionCode: number = 1
): Promise<UpgradeResponse | null> {
  try {
    const config = new Config({
      accessKey: ak,
      accessSecret: sk,
    });
    const client = new Client(config);

    const request = new FileUpgradeRequest({
      fileKey: fk,
      versionCode: versionCode,
      appointVersionCode: 0,
      devModelKey: '',
      devKey: ''
    });

    const response = await client.FileUpgrade(request);

    console.log('\n文件升级信息响应:');
    console.log(`code: ${response.code}`);
    console.log(`msg: ${response.msg}`);
    console.log('data:');
    console.log(`  fileKey: ${response.data.fileKey}`);
    console.log(`  versionName: ${response.data.versionName}`);
    console.log(`  versionCode: ${response.data.versionCode}`);
    console.log(`  urlPath: ${response.data.urlPath}`);
    console.log(`  upgradeType: ${response.data.upgradeType}`);
    console.log(`  promptUpgradeContent: ${response.data.promptUpgradeContent}`);

    return response as UpgradeResponse;
  } catch (error) {
    console.error('\n获取文件升级信息失败:', error);
    return null;
  }
}

/**
 * 上报应用事件
 * @param ak AccessKey
 * @param sk AccessSecret
 * @param params 上报参数
 * @returns 是否上报成功
 */
export async function reportAppEvent(
  ak: string,
  sk: string,
  params: {
    eventType: string
    appKey: string
    versionCode: number
    eventData: Record<string, any>
    devModelKey?: string
    devKey?: string
    timestamp?: string
  }
): Promise<boolean> {
  try {
    const config = new Config({
      accessKey: ak,
      accessSecret: sk,
    });
    const client = new Client(config);

    const request = new AppReportRequest({
      eventType: params.eventType,
      appKey: params.appKey,
      devModelKey: params.devModelKey || '',
      devKey: params.devKey || '',
      versionCode: params.versionCode,
      timestamp: params.timestamp || new Date().toISOString(),
      eventData: params.eventData
    });

    const response = await client.AppReport(request);

    console.log('\n事件上报响应:');
    console.log(`code: ${response.code}`);
    console.log(`msg: ${response.msg}`);

    return response.code === 200;
  } catch (error) {
    console.error('\n事件上报失败:', error);
    return false;
  }
}
