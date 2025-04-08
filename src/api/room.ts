import apiService from '../CodeVerify/services/ApiService';
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  DestroyRoomRequest,
  DestroyRoomResponse,
} from './types';

const BASE_URL = '/api/room';

/**
 * 创建房间
 * @param params 创建房间参数
 * @returns 创建房间结果
 */
export const createRoom = async (params: CreateRoomRequest): Promise<CreateRoomResponse> => {
  return apiService.post(`${BASE_URL}/create`, params);
};

/**
 * 加入房间
 * @param params 加入房间参数
 * @returns 加入房间结果
 */
export const joinRoom = async (params: JoinRoomRequest): Promise<JoinRoomResponse> => {
  return apiService.post(`${BASE_URL}/join`, params);
};

/**
 * 销毁房间
 * @param params 销毁房间参数
 * @returns 销毁房间结果
 */
export const destroyRoom = async (params: DestroyRoomRequest): Promise<DestroyRoomResponse> => {
  return apiService.post(`${BASE_URL}/destroy`, params);
}; 