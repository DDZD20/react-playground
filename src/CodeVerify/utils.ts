import { strFromU8, strToU8, unzlibSync, zlibSync } from "fflate"
import { Files } from "./PlaygroundContext"
import JSZip from "jszip"
import { saveAs } from 'file-saver'

export const fileName2Language = (name: string) => {
    const suffix = name.split('.').pop() || ''
    if (['js', 'jsx'].includes(suffix)) return 'javascript'
    if (['ts', 'tsx'].includes(suffix)) return 'typescript'
    if (['json'].includes(suffix)) return 'json'
    if (['css'].includes(suffix)) return 'css'
    return 'javascript'
}

export function compress(data: string): string {
    const buffer = strToU8(data)
    const zipped = zlibSync(buffer, { level: 9 })
    const str = strFromU8(zipped, true)
    return btoa(str)
}

export function uncompress(base64: string): string {
    const binary = atob(base64)

    const buffer = strToU8(binary, true)
    const unzipped = unzlibSync(buffer)
    return strFromU8(unzipped)
}

export async function downloadFiles(files: Files) {
    const zip = new JSZip()

    Object.keys(files).forEach((name) => {
        zip.file(name, files[name].value)
    })

    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, `code${Math.random().toString().slice(2, 8)}.zip`)
}

/**
 * 日期工具函数
 */

/**
 * 格式化时间戳为友好的时间显示
 * 如果是当天的消息，显示为 HH:MM 格式
 * 如果是昨天的消息，显示为 昨天 HH:MM 格式
 * 如果是更早的消息，显示为 YYYY-MM-DD HH:MM 格式
 * 
 * @param timestamp ISO 格式的时间字符串或Date对象
 * @returns 格式化后的时间字符串
 */
export const formatTime = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  // 检查是否是有效日期
  if (isNaN(date.getTime())) {
    return '未知时间';
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // 格式化时间部分 (HH:MM)
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;
  
  // 检查是当天、昨天还是更早
  if (date >= today) {
    // 今天的消息，只显示时间
    return timeStr;
  } else if (date >= yesterday) {
    // 昨天的消息
    return `昨天 ${timeStr}`;
  } else {
    // 更早的消息，显示完整日期和时间
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${timeStr}`;
  }
};

/**
 * 格式化日期为YYYY-MM-DD格式
 * 
 * @param date ISO 格式的时间字符串或Date对象
 * @returns 格式化后的日期字符串
 */
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // 检查是否是有效日期
  if (isNaN(dateObj.getTime())) {
    return '未知日期';
  }
  
  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const day = dateObj.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 计算两个日期之间的时间差（以天为单位）
 * 
 * @param date1 第一个日期
 * @param date2 第二个日期（默认为当前日期）
 * @returns 相差的天数
 */
export const getDaysBetween = (date1: Date | string, date2: Date | string = new Date()): number => {
  const firstDate = typeof date1 === 'string' ? new Date(date1) : date1;
  const secondDate = typeof date2 === 'string' ? new Date(date2) : date2;
  
  // 检查日期是否有效
  if (isNaN(firstDate.getTime()) || isNaN(secondDate.getTime())) {
    return 0;
  }
  
  // 将时间设置为当天的开始，只比较日期部分
  const utcDate1 = Date.UTC(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
  const utcDate2 = Date.UTC(secondDate.getFullYear(), secondDate.getMonth(), secondDate.getDate());
  
  // 计算天数差（1天 = 24 * 60 * 60 * 1000毫秒）
  return Math.floor((utcDate2 - utcDate1) / (24 * 60 * 60 * 1000));
};
