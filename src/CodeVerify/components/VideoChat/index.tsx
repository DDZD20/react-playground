import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './VideoChatFloating.module.scss';
import { 
  VideoCameraOutlined, 
  VideoCameraAddOutlined,
  ExpandOutlined,
  CompressOutlined,
  SwapOutlined
} from '@ant-design/icons';
import socketService from '@/CodeVerify/services/SocketService';
import authService from '@/CodeVerify/services/AuthService';
import MicLevelIcon from './MicLevelIcon';
interface VideoState {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isExpanded: boolean;
  isVisible: boolean;
  position: { x: number; y: number };
  edge: 'none' | 'left' | 'right' | 'top' | 'bottom';
  isDocked: boolean;
}

const VideoChat: React.FC = () => {
  const [state, setState] = useState<VideoState>({
    isVideoEnabled: true,
    isAudioEnabled: true,
    isExpanded: true,
    isVisible: true,
    position: { x: window.innerWidth - 330, y: 20 },
    edge: 'none',
    isDocked: false
  });

  const [showSelf, setShowSelf] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number }>({
    isDragging: false,
    startX: 0,
    startY: 0
  });
  const timeoutRef = useRef<number | null>(null);

  // WebRTC 相关 hooks
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // 状态：音量等级
  const [audioLevel, setAudioLevel] = useState(0);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioAnimationRef = useRef<number | null>(null);

  useEffect(() => {
    console.log('【调试】获取本地音视频流');
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        console.log('【调试】本地流 track:', stream.getTracks());
        localStreamRef.current = stream;
        if (showSelf && videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
        }
        console.log('【调试】创建 PeerConnection');
        pcRef.current = createPeerConnection();
        stream.getTracks().forEach(track => {
          console.log('【调试】addTrack', track.kind, track);
          pcRef.current?.addTrack(track, stream);
        });
      }).catch(err => {
        console.error('无法获取本地摄像头/麦克风', err);
      });

    // 4. 注册 socketService 信令事件
    socketService.on('videoOffer', handleReceiveOffer);
    socketService.on('videoAnswer', handleReceiveAnswer);
    socketService.on('iceCandidate', handleReceiveCandidate);
    socketService.on('userJoined', handleUserJoined);

    return () => {
      // 清理 PeerConnection
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      // 解绑信令事件
      socketService.off('videoOffer', handleReceiveOffer);
      socketService.off('videoAnswer', handleReceiveAnswer);
      socketService.off('iceCandidate', handleReceiveCandidate);
      socketService.off('userJoined', handleUserJoined);
    };
  // eslint-disable-next-line
  }, []);

  // 切换显示内容时切换 video 源
  useEffect(() => {
    if (videoRef.current) {
      if (showSelf) {
        videoRef.current.srcObject = localStreamRef.current;
        videoRef.current.muted = true;
      } else {
        videoRef.current.srcObject = remoteStreamRef.current;
        videoRef.current.muted = false;
      }
    }
  }, [showSelf]);

  // 监听本地音频流，实时计算音量等级
  useEffect(() => {
    if (!localStreamRef.current) return;
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64; // 提高灵敏度
    analyser.smoothingTimeConstant = 0.4; // 适当平滑
    const source = audioCtx.createMediaStreamSource(localStreamRef.current);
    source.connect(analyser);
    audioAnalyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    function updateLevel() {
      analyser.getByteTimeDomainData(dataArray);
      // 取波形的最大幅度变化
      let max = 0;
      let min = 255;
      for (let i = 0; i < dataArray.length; i++) {
        if (dataArray[i] > max) max = dataArray[i];
        if (dataArray[i] < min) min = dataArray[i];
      }
      // 幅度范围归一化到 0~255
      const amp = max - min;
      setAudioLevel(amp * 2); // 放大灵敏度
      audioAnimationRef.current = requestAnimationFrame(updateLevel);
    }
    updateLevel();
    return () => {
      if (audioAnimationRef.current) cancelAnimationFrame(audioAnimationRef.current);
      analyser.disconnect();
      source.disconnect();
      audioCtx.close();
    };
  }, [localStreamRef.current]);

  // 创建portal容器
  useEffect(() => {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.zIndex = '1000000';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '100vw';
    div.style.height = '100vh';
    div.style.pointerEvents = 'none';
    div.style.transform = 'none';
    document.body.appendChild(div);
    portalRef.current = div;

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      document.body.removeChild(div);
    };
  }, []);

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setState(prev => ({
        ...prev,
        position: {
          x: Math.min(prev.position.x, window.innerWidth - 330),
          y: Math.min(prev.position.y, window.innerHeight - 240)
        }
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 检查是否靠近边缘并确定边缘位置
  const checkEdgePosition = (x: number, y: number) => {
    const EDGE_THRESHOLD = 50;
    const width = state.isExpanded ? 320 : 160;
    const height = state.isExpanded ? 240 : 90;

    if (x <= EDGE_THRESHOLD) return 'left';
    if (x >= window.innerWidth - width - EDGE_THRESHOLD) return 'right';
    if (y <= EDGE_THRESHOLD) return 'top';
    if (y >= window.innerHeight - height - EDGE_THRESHOLD) return 'bottom';
    return 'none';
  };

  // 获取边缘吸附位置（隐藏状态）
  const getDockedPosition = (edge: string) => {
    const width = state.isExpanded ? 320 : 160;
    const height = state.isExpanded ? 240 : 90;
    
    switch (edge) {
      case 'left':
        return { x: -width + 8, y: Math.max(20, Math.min(state.position.y, window.innerHeight - height - 20)) };
      case 'right':
        return { x: window.innerWidth - 8, y: Math.max(20, Math.min(state.position.y, window.innerHeight - height - 20)) };
      case 'top':
        return { x: Math.max(20, Math.min(state.position.x, window.innerWidth - width - 20)), y: -height + 8 };
      case 'bottom':
        return { x: Math.max(20, Math.min(state.position.x, window.innerWidth - width - 20)), y: window.innerHeight - 8 };
      default:
        return state.position;
    }
  };

  // 获取展开位置（显示状态）
  const getExpandedPosition = (edge: string) => {
    const width = state.isExpanded ? 320 : 160;
    const height = state.isExpanded ? 240 : 90;
    const MARGIN = 20; // 边缘距离
    
    switch (edge) {
      case 'left':
        return { x: MARGIN, y: Math.max(MARGIN, Math.min(state.position.y, window.innerHeight - height - MARGIN)) };
      case 'right':
        return { x: window.innerWidth - width - MARGIN, y: Math.max(MARGIN, Math.min(state.position.y, window.innerHeight - height - MARGIN)) };
      case 'top':
        return { x: Math.max(MARGIN, Math.min(state.position.x, window.innerWidth - width - MARGIN)), y: MARGIN };
      case 'bottom':
        return { x: Math.max(MARGIN, Math.min(state.position.x, window.innerWidth - width - MARGIN)), y: window.innerHeight - height - MARGIN };
      default:
        return state.position;
    }
  };

  // 处理拖拽开始
  const handleMouseDown = (e: React.MouseEvent) => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    dragRef.current = {
      isDragging: true,
      startX: e.clientX - state.position.x,
      startY: e.clientY - state.position.y
    };
    setState(prev => ({ ...prev, isDocked: false }));
  };

  // 处理拖拽移动
  const handleMouseMove = (e: MouseEvent) => {
    if (!dragRef.current.isDragging) return;

    const width = state.isExpanded ? 320 : 160;
    const height = state.isExpanded ? 240 : 90;
    const MARGIN = 20;

    const newX = Math.max(MARGIN, Math.min(e.clientX - dragRef.current.startX, window.innerWidth - width - MARGIN));
    const newY = Math.max(MARGIN, Math.min(e.clientY - dragRef.current.startY, window.innerHeight - height - MARGIN));

    const edge = checkEdgePosition(newX, newY);
    setState(prev => ({
      ...prev,
      position: { x: newX, y: newY },
      edge,
      isVisible: true
    }));
  };

  // 处理拖拽结束
  const handleMouseUp = () => {
    if (!dragRef.current.isDragging) return;
    
    dragRef.current.isDragging = false;
    if (state.edge !== 'none') {
      setState(prev => ({
        ...prev,
        position: getDockedPosition(prev.edge),
        isVisible: false,
        isDocked: true
      }));
    }
  };

  // 处理鼠标移入边缘区域
  const handleEdgeHover = () => {
    if (state.edge !== 'none' && state.isDocked) {
      setState(prev => ({
        ...prev,
        isVisible: true,
        position: getExpandedPosition(prev.edge)
      }));
    }
  };

  // 处理鼠标移出边缘区域
  const handleEdgeLeave = () => {
    if (state.edge !== 'none' && state.isDocked && !dragRef.current.isDragging) {
      timeoutRef.current = window.setTimeout(() => {
        setState(prev => ({
          ...prev,
          isVisible: false,
          position: getDockedPosition(prev.edge)
        }));
      }, 200);
    }
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [state.edge, state.isExpanded]);

  // 修复视频开关：控制本地视频track的enabled属性，并刷新video元素srcObject
  const toggleVideo = () => {
    setState(prev => {
      const newEnabled = !prev.isVideoEnabled;
      // 控制本地流track
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(track => {
          track.enabled = newEnabled;
        });
      }
      // 重新赋值，确保UI刷新
      if (videoRef.current && localStreamRef.current) {
        videoRef.current.srcObject = localStreamRef.current;
      }
      return { ...prev, isVideoEnabled: newEnabled };
    });
  };

  const toggleAudio = () => {
    setState(prev => ({ ...prev, isAudioEnabled: !prev.isAudioEnabled }));
  };

  const toggleExpand = () => {
    setState(prev => {
      const newExpanded = !prev.isExpanded;
      const position = prev.isDocked 
        ? getDockedPosition(prev.edge)
        : prev.position;
      return {
        ...prev,
        isExpanded: newExpanded,
        position
      };
    });
  };

  // 自动隐藏 videoControls
  useEffect(() => {
    if (!showControls) return;
    if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => setShowControls(false), 7000);
    return () => {
      if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    };
  }, [showControls]);

  // 鼠标靠近视频区域时显示 controls
  const handleMouseMoveOnVideo = () => {
    setShowControls(true);
  };

  // 建立远端流后自动切换到显示面试官
  useEffect(() => {
    if (!showSelf && remoteStreamRef.current) {
      setShowSelf(false);
    }
  }, [remoteStreamRef.current]);

  // 翻转按钮 handler
  const handleSwapVideo = () => {
    setShowSelf(s => !s);
    setShowControls(true);
  };

  // 创建 PeerConnection 并绑定事件
  function createPeerConnection() {
    console.log('【调试】创建 PeerConnection');
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.xten.com:3478' },
        { urls: 'stun:stun.qq.com:3478' },
        { urls: 'stun:stun.uc.cn:3478' }
      ]
    });

    pc.oniceconnectionstatechange = () => {
      console.log('【调试】ICE 状态:', pc.iceConnectionState);
    };

    // 收集本地 candidate
    pc.onicecandidate = (event) => {
      console.log('【调试】onicecandidate', event.candidate);
      if (event.candidate) {
        socketService.sendSignaling('iceCandidate', { roomId: socketService.getCurrentRoomId(), candidate: event.candidate });
      }
    };

    // 远端流 track
    pc.ontrack = (event) => {
      console.log('【调试】ontrack event:', event);
      const [remoteStream] = event.streams;
      remoteStreamRef.current = remoteStream;
      if (!showSelf && videoRef.current) {
        videoRef.current.srcObject = remoteStream;
        videoRef.current.muted = false;
      }
    };

    return pc;
  }

  // 处理收到 offer
  async function handleReceiveOffer(data: any) {
    console.log('【调试】收到 offer', data);
    if (!pcRef.current) pcRef.current = createPeerConnection();
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);
    socketService.sendSignaling('videoAnswer', { roomId: socketService.getCurrentRoomId(), answer });
  }

  // 处理收到 answer
  async function handleReceiveAnswer(data: any) {
    console.log('【调试】收到 answer', data);
    if (!pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
  }

  // 处理收到 candidate
  async function handleReceiveCandidate(data: any) {
    console.log('【调试】收到 candidate', data);
    if (!pcRef.current) return;
    try {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (err) {
      console.error('添加 ICE candidate 失败', err);
    }
  }

  // 检测到有新用户加入房间时自动发起视频通话
  async function handleUserJoined() {
    console.log('【调试】新用户加入房间');
    // 获取当前用户信息
    const currentUser = authService.getCurrentUser();
    // 只有面试官才发起 offer
    if (!currentUser || currentUser.role !== 'Interviewer') {
      console.log('当前用户不是面试官，不发起 offer');
      return;
    }
    if (!pcRef.current) pcRef.current = createPeerConnection();
    // 创建 offer 并发送
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    socketService.sendSignaling('videoOffer', { roomId: socketService.getCurrentRoomId(), offer });
  }

  // 发起通话（可绑定到按钮）
  // 暂时不使用此函数，但保留以备后续功能扩展
  const _startCall = async () => {
    if (!pcRef.current) pcRef.current = createPeerConnection();
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    socketService.sendSignaling('videoOffer', { roomId: socketService.getCurrentRoomId(), offer });
  };

  if (!portalRef.current) return null;

  const containerStyle: React.CSSProperties = {
    transform: `translate3d(${state.position.x}px, ${state.position.y}px, 0)`,
    opacity: state.isVisible ? 1 : 0.2,
    transition: dragRef.current.isDragging ? 'none' : 'all 0.2s ease',
    width: state.isExpanded ? '320px' : '160px',
    height: state.isExpanded ? '240px' : '90px'
  };

  // 创建边缘触发区域
  const edgeStyle: React.CSSProperties = {
    position: 'fixed',
    [state.edge]: 0,
    ...(state.edge === 'left' || state.edge === 'right' 
      ? { 
          width: state.isVisible ? '0px' : '30px', 
          height: '100vh', 
          top: 0 
        }
      : { 
          height: state.isVisible ? '0px' : '30px', 
          width: '100vw', 
          left: 0 
        }),
    pointerEvents: state.isVisible ? 'none' : 'auto',
    zIndex: 999999
  };

  return createPortal(
    <>
      {state.edge !== 'none' && state.isDocked && (
        <div 
          style={edgeStyle}
          onMouseEnter={handleEdgeHover}
        />
      )}
      <div
        ref={containerRef}
        className={styles.videoContainerOuter}
        style={containerStyle}
        onMouseEnter={() => {
          if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
          }
          if (state.isDocked) {
            setState(prev => ({ 
              ...prev, 
              isVisible: true,
              position: getExpandedPosition(prev.edge)
            }));
          }
        }}
        onMouseLeave={(e: React.MouseEvent) => {
          // 检查鼠标是否移动到了屏幕边缘
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const isMovingToEdge = (
            state.edge === 'left' && e.clientX < rect.left ||
            state.edge === 'right' && e.clientX > rect.right ||
            state.edge === 'top' && e.clientY < rect.top ||
            state.edge === 'bottom' && e.clientY > rect.bottom
          );

          if (!isMovingToEdge) {
            handleEdgeLeave();
          }
        }}
      >
        <div 
          className={styles.dragHandle}
          onMouseDown={handleMouseDown}
        />
        
        <div className={styles.videoContainer} onMouseMove={handleMouseMoveOnVideo}>
          <video
            className={styles.videoElement}
            autoPlay
            playsInline
            ref={videoRef}
            onLoadedMetadata={() => console.log('✅ 远端视频流已加载')}
            onPlaying={() => console.log('✅ 远端视频正在播放')}
          />
        </div>

        <div className={styles.videoControls} style={{ opacity: showControls ? 1 : 0, transition: 'opacity 0.3s' }}>
          <button 
            className={styles.controlButton}
            onClick={handleSwapVideo}
            title={showSelf ? '切换显示面试官' : '切换显示自己'}
          >
            <SwapOutlined />
          </button>
          <button 
            className={`${styles.controlButton} ${state.isVideoEnabled ? styles.active : ''}`}
            onClick={toggleVideo}
            title={state.isVideoEnabled ? '关闭视频' : '开启视频'}
          >
            {state.isVideoEnabled ? <VideoCameraOutlined /> : <VideoCameraAddOutlined />}
          </button>
          <button 
            className={`${styles.controlButton}`}
            onClick={toggleAudio}
            title={state.isAudioEnabled ? '静音' : '取消静音'}
          >
            <MicLevelIcon level={audioLevel} muted={!state.isAudioEnabled} size={28} />
          </button>
          <button 
            className={`${styles.controlButton}`}
            onClick={toggleExpand}
            title={state.isExpanded ? '收起' : '展开'}
          >
            {state.isExpanded ? <CompressOutlined /> : <ExpandOutlined />}
          </button>
        </div>
      </div>
    </>,
    portalRef.current
  );
};

export default VideoChat; 