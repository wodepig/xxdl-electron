// http://upgrade.toolsetlink.com/的工具
// 这里的请求都是通过程序配置出来的, 不是启动器的up. 注意启动器和程序绑定的是不是同一个up
// 启动器的up是用来升级启动器的, 程序的up是用来升级程序的
// @ts-ignore
import md5 from 'blueimp-md5/js/md5.min';
import { randomBytes } from 'crypto';

// Up的配置请求响应体
 type UpConfigurationResp ={
    configurationKey: string,
    versionName: string,
    versionCode: number,
    upgradeType: number,
    promptUpgradeContent: string,
    content: any
  }
  type UpgradeResp = {
    code: number;
    message: string;
    data: {
      fileKey: string,
      versionName: string,
      versionCode: number,
      urlPath: string,
      urlFileSize: number,
      upgradeType: number,
      promptUpgradeContent: string
  }
  
  }

// 检查参数
export const paramsCheck = async (key:string) =>{
    const resp = await sendPost<UpConfigurationResp>('/v1/configuration/upgrade', {
        "configurationKey": key,
        "versionCode": 1,
    })
    if(!resp){
         console.log('参数检查失败')
         return null
    }
    return resp
}

// 检查文件的更新信息
export const fileCheckVersion = async (fileKey:string,versionCode: number = 1) => {
 
    const resp = await sendPost<UpgradeResp>('/v1/file/upgrade', {
        "fileKey": fileKey,
        "versionCode": versionCode,
    })
    if(!resp){
        console.log('检查失败')
         return null
    }
    return resp
    }



function timeRFC3339(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const tzOffset = date.getTimezoneOffset();
    const tzSign = tzOffset <= 0 ? '+' : '-';
    const absTzOffset = Math.abs(tzOffset);
    const tzHours = String(Math.floor(absTzOffset / 60)).padStart(2, '0');
    const tzMinutes = String(absTzOffset % 60).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${tzSign}${tzHours}:${tzMinutes}`;
}
/**
 * @remarks
 * 生成16位随机Nonce
 * @returns generateNonce
 */
// Electron 主进程实现方式（使用 Node.js crypto 模块）
function generateNonce(): string {
    // 生成 8 字节（64位）的随机字节
    const randomBytesBuffer = randomBytes(8);

    // 将字节数组转换为十六进制字符串
    // 这是一个高效的转换方法
    return Array.from(randomBytesBuffer, byte => byte.toString(16).padStart(2, '0')).join('');
}
/**
 * @remarks
 * 生成签名
 * @returns generateSignature
 */
async function generateSignature(
    body: string,
    nonce: string,
    secretKey: string,
    timestamp: string,
    uri: string
): Promise<string> {
    const parts: string[] = [];
    // debugger
    if (body !== '') {
        parts.push(`body=${body}`);
    }

    parts.push(
        `nonce=${nonce}`,
        `secretKey=${secretKey}`,
        `timestamp=${timestamp}`,
        `url=${uri}`
    );

    const signStr = parts.join('&');
    // return crypto.createHash('md5').update(signStr).digest('hex');
    // console.log(signStr);

    return await md5(signStr)
}

const sendPost = async <T>(uri:string, body:any)=>{

    const url = 'https://api.upgrade.toolsetlink.com'+ uri
    let bodyFinal = {...body,
        "devKey":"13",
        "devModelKey":"24"
    }
     const nonce = generateNonce()
    const timestamp = timeRFC3339()
    const sign = await generateSignature(
        JSON.stringify(bodyFinal),
        nonce,
        'LPXuXTnd8Oi0SYe1m9Kw0vimueae6XnKxYBP7rbutyw',
        timestamp, uri)
        try{
            const res =  await fetch(url, {
                method: 'POST',
                body: bodyFinal,
                headers: {
                    'X-Timestamp': timestamp,
                    'X-Nonce': nonce,
                    'X-Signature': sign,
                    'X-AccessKey': 'zxWZFA-tnrOrQv19aafYHg',
                },
            })
            console.log('sign',sign);
            console.log('timestamp',timestamp);
            console.log('nonce',nonce);
            console.log('process.env',JSON.stringify(process.env));
            return res.json() as T
        }catch(e:any){
            console.log('请求失败')
           console.log(e);
           
            return null
        }
}