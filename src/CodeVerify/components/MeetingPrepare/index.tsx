import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button, Card, Select, Space, Typography, message, Alert } from 'antd';
import { AudioOutlined, VideoCameraOutlined, CheckCircleOutlined, ReloadOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import styles from './index.module.scss';

const { Title, Text } = Typography;
const { Option } = Select;

interface MeetingParams {
  roomId: string;
  password?: string;
  isHost: string;
}

const MeetingPrepare: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const visualizerRef = useRef<HTMLDivElement>(null);

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isDevicesReady, setIsDevicesReady] = useState(false);
  const [volume, setVolume] = useState(0);
  const [hasAudioPermission, setHasAudioPermission] = useState<boolean | null>(null);
  const [hasVideoPermission, setHasVideoPermission] = useState<boolean | null>(null);
  const [meetingParams, setMeetingParams] = useState<MeetingParams | null>(null);

  // 从 URL 参数获取会议信息
  useEffect(() => {
    const roomId = searchParams.get('roomId');
    const password = searchParams.get('password');
    const isHost = searchParams.get('isHost');

    if (!roomId) {
      message.error('会议信息不完整');
      navigate('/');
      return;
    }

    setMeetingParams({
      roomId,
      password: password || undefined,
      isHost: isHost || 'false'
    });
  }, [searchParams, navigate]);

  // 检查权限和初始化设备
  useEffect(() => {
    if (!meetingParams?.roomId) return;

    // 每次进入页面都检查权限状态
    checkPermissions();
    
    return () => {
      stopStream();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [meetingParams]);

  const checkPermissions = async () => {
    try {
      // 先尝试直接获取设备权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      
      // 如果成功获取权限，立即停止流（我们只需要权限）
      stream.getTracks().forEach(track => track.stop());
      
      setHasAudioPermission(true);
      setHasVideoPermission(true);
      
      // 初始化设备
      initializeDevices();
    } catch (error) {
      console.error('Error checking permissions:', error);
      
      // 如果直接获取失败，尝试分别获取权限
      try {
        // 检查音频权限
        const audioPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setHasAudioPermission(audioPermission.state === 'granted');
        
        // 检查视频权限
        const videoPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setHasVideoPermission(videoPermission.state === 'granted');
        
        // 如果权限已授予，初始化设备
        if (audioPermission.state === 'granted' && videoPermission.state === 'granted') {
          initializeDevices();
        }
      } catch (permError) {
        console.error('Error checking permissions with Permissions API:', permError);
        // 如果权限 API 不可用，设置权限状态为 false
        setHasAudioPermission(false);
        setHasVideoPermission(false);
      }
    }
  };

  const requestAudioPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // 立即停止流，我们只需要权限
      setHasAudioPermission(true);
      
      // 如果视频权限也已获得，初始化设备
      if (hasVideoPermission) {
        initializeDevices();
      }
    } catch (error) {
      console.error('Error requesting audio permission:', error);
      setHasAudioPermission(false);
    }
  };

  const requestVideoPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // 立即停止流，我们只需要权限
      setHasVideoPermission(true);
      
      // 如果音频权限也已获得，初始化设备
      if (hasAudioPermission) {
        initializeDevices();
      }
    } catch (error) {
      console.error('Error requesting video permission:', error);
      setHasVideoPermission(false);
    }
  };

  const initializeDevices = async () => {
    try {
      // 只有在两个权限都已获得的情况下才初始化设备
      if (!hasAudioPermission || !hasVideoPermission) {
        return;
      }
      
      // 先停止现有的流
      stopStream();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 初始化音频分析
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      startAudioVisualization();

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const videoInputs = devices.filter(device => device.kind === 'videoinput');

      setAudioDevices(audioInputs);
      setVideoDevices(videoInputs);

      if (audioInputs.length > 0) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }
      if (videoInputs.length > 0) {
        setSelectedVideoDevice(videoInputs[0].deviceId);
      }

      setIsDevicesReady(true);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      message.error('无法访问摄像头或麦克风，请检查设备权限');
      setIsDevicesReady(false);
    }
  };

  const startAudioVisualization = () => {
    if (!analyserRef.current || !visualizerRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateVisualizer = () => {
      if (!analyserRef.current || !visualizerRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
      const normalizedVolume = Math.min(average / 128, 1);
      
      setVolume(normalizedVolume);
      visualizerRef.current.style.setProperty('--volume', normalizedVolume.toString());
      
      animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    };

    updateVisualizer();
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const handleDeviceChange = async (deviceId: string, type: 'audio' | 'video') => {
    if (!streamRef.current) return;

    const constraints = {
      audio: type === 'audio' ? { deviceId: { exact: deviceId } } : false,
      video: type === 'video' ? { deviceId: { exact: deviceId } } : false
    };

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const tracks = newStream.getTracks();
      
      // 停止旧的轨道
      if (type === 'audio') {
        streamRef.current.getAudioTracks().forEach(track => track.stop());
        streamRef.current.removeTrack(streamRef.current.getAudioTracks()[0]);
        streamRef.current.addTrack(tracks[0]);
      } else {
        streamRef.current.getVideoTracks().forEach(track => track.stop());
        streamRef.current.removeTrack(streamRef.current.getVideoTracks()[0]);
        streamRef.current.addTrack(tracks[0]);
      }
    } catch (error) {
      console.error('Error switching device:', error);
      message.error('切换设备失败');
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  const handleJoinMeeting = () => {
    if (!meetingParams) return;
    
    // 使用 URL 参数导航到会议页面
    const params = new URLSearchParams();
    params.set('roomId', meetingParams.roomId);
    if (meetingParams.password) {
      params.set('password', meetingParams.password);
    }
    params.set('isHost', meetingParams.isHost);
    params.set('audioDeviceId', selectedAudioDevice);
    params.set('videoDeviceId', selectedVideoDevice);
    params.set('isAudioEnabled', isAudioEnabled.toString());
    params.set('isVideoEnabled', isVideoEnabled.toString());
    
    navigate(`/playground?${params.toString()}`);
  };

  const getBrowserName = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome')) return 'Chrome';
    if (userAgent.includes('firefox')) return 'Firefox';
    if (userAgent.includes('safari')) return 'Safari';
    if (userAgent.includes('edge')) return 'Edge';
    return '浏览器';
  };

  const getPermissionHelpLink = () => {
    const browser = getBrowserName();
    switch (browser) {
      case 'Chrome':
        return 'chrome://settings/content/camera';
      case 'Firefox':
        return 'about:preferences#privacy';
      case 'Safari':
        return 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera';
      case 'Edge':
        return 'edge://settings/content/camera';
      default:
        return '';
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.prepareCard}>
        <Title level={3}>会议准备</Title>
        <Text type="secondary">会议号：{meetingParams?.roomId}</Text>

        <div className={styles.videoContainer}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={styles.videoPreview}
          />
          <div 
            ref={visualizerRef} 
            className={styles.audioVisualizer}
            style={{ '--volume': volume } as React.CSSProperties}
          />
        </div>

        <div className={styles.controls}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 权限状态提示 */}
            {(hasAudioPermission === false || hasVideoPermission === false) && (
              <Alert
                message="权限被拒绝"
                description={
                  <div>
                    <p>您已拒绝了{!hasAudioPermission && !hasVideoPermission ? '麦克风和摄像头' : !hasAudioPermission ? '麦克风' : '摄像头'}权限。</p>
                    <p>要重新启用权限，请：</p>
                    <ol>
                      <li>点击{getBrowserName()}地址栏左侧的锁定图标</li>
                      <li>找到{!hasAudioPermission && !hasVideoPermission ? '麦克风和摄像头' : !hasAudioPermission ? '麦克风' : '摄像头'}权限设置</li>
                      <li>将权限改为"允许"</li>
                      <li>刷新页面</li>
                    </ol>
                    <Button 
                      type="link" 
                      icon={<QuestionCircleOutlined />}
                      onClick={() => window.open(getPermissionHelpLink(), '_blank')}
                    >
                      查看{getBrowserName()}权限设置帮助
                    </Button>
                  </div>
                }
                type="warning"
                showIcon
              />
            )}

            {/* 权限请求按钮 */}
            <div className={styles.permissionButtons}>
              {hasAudioPermission === false && (
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={requestAudioPermission}
                  type="primary"
                  danger
                >
                  重新请求麦克风权限
                </Button>
              )}
              {hasVideoPermission === false && (
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={requestVideoPermission}
                  type="primary"
                  danger
                >
                  重新请求摄像头权限
                </Button>
              )}
            </div>

            <div className={styles.deviceSelectors}>
              <Select
                style={{ width: '100%' }}
                placeholder="选择麦克风"
                value={selectedAudioDevice}
                onChange={(value) => {
                  setSelectedAudioDevice(value);
                  handleDeviceChange(value, 'audio');
                }}
                disabled={!hasAudioPermission}
              >
                {audioDevices.map(device => (
                  <Option key={device.deviceId} value={device.deviceId}>
                    {device.label || `麦克风 ${device.deviceId.slice(0, 5)}`}
                  </Option>
                ))}
              </Select>

              <Select
                style={{ width: '100%' }}
                placeholder="选择摄像头"
                value={selectedVideoDevice}
                onChange={(value) => {
                  setSelectedVideoDevice(value);
                  handleDeviceChange(value, 'video');
                }}
                disabled={!hasVideoPermission}
              >
                {videoDevices.map(device => (
                  <Option key={device.deviceId} value={device.deviceId}>
                    {device.label || `摄像头 ${device.deviceId.slice(0, 5)}`}
                  </Option>
                ))}
              </Select>
            </div>

            <Space className={styles.deviceControls}>
              <Button
                type={isAudioEnabled ? 'primary' : 'default'}
                icon={<AudioOutlined />}
                onClick={toggleAudio}
                disabled={!hasAudioPermission}
              >
                {isAudioEnabled ? '关闭麦克风' : '开启麦克风'}
              </Button>
              <Button
                type={isVideoEnabled ? 'primary' : 'default'}
                icon={<VideoCameraOutlined />}
                onClick={toggleVideo}
                disabled={!hasVideoPermission}
              >
                {isVideoEnabled ? '关闭摄像头' : '开启摄像头'}
              </Button>
            </Space>

            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              size="large"
              onClick={handleJoinMeeting}
              disabled={!isDevicesReady || !hasAudioPermission || !hasVideoPermission}
              block
            >
              加入会议
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default MeetingPrepare; 