import { Conf } from 'electron-conf/main'
import {getAppDir} from './utils'

/**
 * 获取配置项
 * @param key
 * @param defaultValue
 * @param nameSpace
 */
export const getConfValue = (key:string,defaultValue?:any,nameSpace?: string)=>{
  if(!nameSpace){
    nameSpace = 'common'
  }
  const conf = new Conf({name:nameSpace,dir:getAppDir()})
  const v = conf.get(key)
  if(!v){
    return  defaultValue? defaultValue: ''
  }
  return v
}

export const setConfValue = (key:string,value:any,nameSpace?: string)=>{
  if(!nameSpace){
    nameSpace = 'common'
  }
  const conf = new Conf({name:nameSpace,dir:getAppDir()})
  conf.set(key,value)
}

export const clearConf = (nameSpace?: string)=>{
  const conf = new Conf({name:nameSpace,dir:getAppDir()})
  conf.clear()
}
