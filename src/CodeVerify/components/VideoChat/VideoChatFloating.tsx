import React, { useState, useRef, useEffect } from 'react';
import { User } from '../../../api/types';
import { Button, Avatar } from 'antd';
import { 
  VideoCameraOutlined, 
  VideoCameraAddOutlined,
  AudioOutlined,
  AudioMutedOutlined
} from '@ant-design/icons';
import styles from './VideoChatFloating.module.scss';

interface VideoChatFloatingProps {
  user: User;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  onVideoToggle?: (enabled: boolean) => void;
  onAudioToggle?: (enabled: boolean) => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
  className?: string;
}

const VideoChatFloating: React.FC<VideoChatFloatingProps> = ({
  user,
  isVideoEnabled = false,
  isAudioEnabled = true,
  onVideoToggle,
  onAudioToggle,
  videoRef,
  className
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStartPos.current.x,
      y: e.clientY - dragStartPos.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove as any);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove as any);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      className={`${styles.floatingContainer} ${className || ''}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className={styles.videoContainer}>
        {isVideoEnabled ? (
          <video
            ref={videoRef}
            className={styles.video}
            autoPlay
            playsInline
            muted
          />
        ) : (
          <div className={styles.avatarContainer}>
            <Avatar 
              size={120} 
              src={user.avatar}
              className={styles.avatar}
            >
              {user.username[0].toUpperCase()}
            </Avatar>
          </div>
        )}
      </div>
      
      <div className={styles.controls}>
        <Button
          type="text"
          icon={isVideoEnabled ? <VideoCameraOutlined /> : <VideoCameraAddOutlined />}
          onClick={() => onVideoToggle?.(!isVideoEnabled)}
          className={`${styles.controlButton} ${isVideoEnabled ? styles.active : ''}`}
        />
        <Button
          type="text"
          icon={isAudioEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
          onClick={() => onAudioToggle?.(!isAudioEnabled)}
          className={`${styles.controlButton} ${isAudioEnabled ? styles.active : ''}`}
        />
      </div>
      
      <div className={styles.userInfo}>
        <span className={styles.username}>{user.username}</span>
      </div>
    </div>
  );
};

export default VideoChatFloating; 