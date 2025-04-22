import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './VideoChatFloating.module.scss';
import { 
  VideoCameraOutlined, 
  VideoCameraAddOutlined,
  AudioOutlined,
  AudioMutedOutlined,
  ExpandOutlined,
  CompressOutlined,
  UserOutlined
} from '@ant-design/icons';

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

  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number }>({
    isDragging: false,
    startX: 0,
    startY: 0
  });
  const timeoutRef = useRef<number | null>(null);

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

  const toggleVideo = () => {
    setState(prev => ({ ...prev, isVideoEnabled: !prev.isVideoEnabled }));
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
        
        <div className={styles.videoContainer}>
          {state.isVideoEnabled ? (
            <video
              className={styles.videoElement}
              autoPlay
              muted={!state.isAudioEnabled}
              playsInline
            >
              <source src="" type="video/mp4" />
            </video>
          ) : (
            <div className={styles.placeholderAvatar}>
              <UserOutlined className={styles.avatarIcon} />
            </div>
          )}
        </div>

        <div className={styles.videoControls}>
          <button 
            className={`${styles.controlButton} ${state.isVideoEnabled ? styles.active : ''}`}
            onClick={toggleVideo}
            title={state.isVideoEnabled ? '关闭视频' : '开启视频'}
          >
            {state.isVideoEnabled ? <VideoCameraOutlined /> : <VideoCameraAddOutlined />}
          </button>

          <button 
            className={`${styles.controlButton} ${state.isAudioEnabled ? styles.active : ''}`}
            onClick={toggleAudio}
            title={state.isAudioEnabled ? '静音' : '取消静音'}
          >
            {state.isAudioEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
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