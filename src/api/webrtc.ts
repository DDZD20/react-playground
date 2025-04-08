/**
 * WebRTC相关API服务
 * 
 * 该模块提供WebRTC信令相关的API请求函数
 */

import apiService from '../CodeVerify/services/ApiService';
import { API_ENDPOINTS } from './config';
import type {
  ApiResponse,
  RTCSignalMessage,
} from './types';

/**
 * 发送WebRTC信令消息
 * 
 * @param {RTCSignalMessage} message - 信令消息
 * @returns {Promise<ApiResponse<void>>} - 返回发送结果
 */
export const sendSignal = async (message: RTCSignalMessage): Promise<ApiResponse<void>> => {
  return apiService.post<ApiResponse<void>>(API_ENDPOINTS.WEBRTC.SIGNAL, message);
}; 