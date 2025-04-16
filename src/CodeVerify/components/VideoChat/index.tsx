import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { Button, Input, message, Tooltip } from 'antd';
import { 
  VideoCameraOutlined, 
  VideoCameraAddOutlined,
  AudioOutlined,
  AudioMutedOutlined,
  CopyOutlined,
  LinkOutlined
} from '@ant-design/icons';
import styles from './VideoChatFloating.module.scss';

interface VideoChatProps {
  className?: string;
}

const VideoChat: React.FC<VideoChatProps> = ({ className }) => {
  // 状态
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // 引用
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerInstance = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  // 初始化 Peer
  useEffect(() => {
    const peer = new Peer();
    
    peer.on('open', (id) => {
      setPeerId(id);
      console.log('我的 Peer ID:', id);
    });
    
    peer.on('call', (call) => {
      // 获取本地媒体流
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          // 保存本地流引用
          localStreamRef.current = stream;
          
          // 显示本地视频
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          
          // 应答呼叫
          call.answer(stream);
          
          // 接收远程视频流
          call.on('stream', (remoteStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
            setIsConnected(true);
            message.success('已连接到对方');
          });
          
          // 处理连接关闭
          call.on('close', () => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
            setIsConnected(false);
            message.info('连接已关闭');
          });
        })
        .catch((err) => {
          console.error('获取媒体设备失败:', err);
          message.error('无法访问摄像头或麦克风');
        });
    });
    
    peer.on('error', (err) => {
      console.error('Peer 错误:', err);
      message.error('连接出错: ' + err.type);
    });
    
    peerInstance.current = peer;
    
    return () => {
      peer.destroy();
    };
  }, []);
  
  // 连接到对方
  const connectToPeer = () => {
    if (!remotePeerId) {
      message.warning('请输入对方的 ID');
      return;
    }
    
    setIsLoading(true);
    
    // 获取本地媒体流
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        // 保存本地流引用
        localStreamRef.current = stream;
        
        // 显示本地视频
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // 呼叫远程用户
        const call = peerInstance.current?.call(remotePeerId, stream);
        
        if (call) {
          // 接收远程视频流
          call.on('stream', (remoteStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
            setIsConnected(true);
            message.success('已连接到对方');
          });
          
          // 处理连接关闭
          call.on('close', () => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
            setIsConnected(false);
            message.info('连接已关闭');
          });
        }
      })
      .catch((err) => {
        console.error('获取媒体设备失败:', err);
        message.error('无法访问摄像头或麦克风');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  // 复制自己的 ID
  const copyPeerId = () => {
    navigator.clipboard.writeText(peerId)
      .then(() => {
        message.success('ID 已复制到剪贴板');
      })
      .catch(() => {
        message.error('复制失败');
      });
  };
  
  // 切换视频
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };
  
  // 切换音频
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };
  
  return (
    <div className={`${styles.videoChatContainer} ${className || ''}`}>
      <div className={styles.header}>
        <h3>视频聊天</h3>
        <div className={styles.peerId}>
          <span>你的 ID: {peerId}</span>
          <Tooltip title="复制 ID">
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              onClick={copyPeerId}
              size="small"
            />
          </Tooltip>
        </div>
      </div>
      
      <div className={styles.connectionForm}>
        <Input
          placeholder="输入对方 ID"
          value={remotePeerId}
          onChange={(e) => setRemotePeerId(e.target.value)}
          prefix={<LinkOutlined />}
        />
        <Button 
          type="primary" 
          onClick={connectToPeer}
          loading={isLoading}
          disabled={!remotePeerId || isConnected}
        >
          {isConnected ? '已连接' : '连接'}
        </Button>
      </div>
      
      <div className={styles.videoContainer}>
        <div className={styles.videoWrapper}>
          <h4>本地视频</h4>
          <video 
            ref={localVideoRef} 
            autoPlay 
            muted 
            playsInline
            className={styles.video}
          />
          <div className={styles.controls}>
            <Button
              type="text"
              icon={isVideoEnabled ? <VideoCameraOutlined /> : <VideoCameraAddOutlined />}
              onClick={toggleVideo}
              className={`${styles.controlButton} ${isVideoEnabled ? styles.active : ''}`}
            />
            <Button
              type="text"
              icon={isAudioEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
              onClick={toggleAudio}
              className={`${styles.controlButton} ${isAudioEnabled ? styles.active : ''}`}
            />
          </div>
        </div>
        
        <div className={styles.videoWrapper}>
          <h4>远程视频</h4>
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline
            className={styles.video}
          />
          {!isConnected && (
            <div className={styles.waitingConnection}>
              <p>等待连接...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoChat; 