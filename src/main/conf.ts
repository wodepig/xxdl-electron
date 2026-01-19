import { Conf } from 'electron-conf/main'
import {getAppDir} from './utils'

/**
 * 获取环境变量
 * @param key
 * @param defaultValue
 */
export const  getEnvConf = (key:string, defaultValue:string = 'default') =>{
  const value = import.meta.env[ key]
  if(value){
    return value
  }
  return defaultValue
}

/**
 * 获取配置项
 * @param key 支持a.b属性
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

/**
 * 设置配置项
 * @param key 支持a.b嵌套
 * @param value
 * @param nameSpace
 */
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
