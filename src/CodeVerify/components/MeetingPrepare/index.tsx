import React, { useEffect, useRef, useState } from 'react';
import { Card, Typography, Select, Button, Tooltip, message } from 'antd';
import { AudioOutlined, VideoCameraOutlined, AudioMutedOutlined, VideoCameraAddOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { joinRoom } from '../../../api/room';
import styles from './index.module.scss';

const { Title, Text } = Typography;

interface DeviceInfo {
  deviceId: string;
  label: string;
}

const MeetingPrepare: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('roomId');
  // 暂时不使用 password，但保留获取逻辑以备后续功能扩展
  // const password = searchParams.get('password');
  const isHost = searchParams.get('isHost') === 'true';

  const [hasAudioPermission, setHasAudioPermission] = useState<boolean>(false);
  const [hasVideoPermission, setHasVideoPermission] = useState<boolean>(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [audioDevices, setAudioDevices] = useState<DeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<DeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [isDevicesReady, setIsDevicesReady] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  // 检查音频权限
  const checkAudioPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasAudioPermission(true);
      return true;
    } catch (error) {
      console.error('获取音频权限失败:', error);
      setHasAudioPermission(false);
      return false;
    }
  };

  // 检查视频权限
  const checkVideoPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setHasVideoPermission(true);
      return true;
    } catch (error) {
      console.error('获取视频权限失败:', error);
      setHasVideoPermission(false);
      return false;
    }
  };

  // 初始化音频设备
  const initializeAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `麦克风 ${audioDevices.length + 1}`
        }));

      setAudioDevices(audioInputs);

      if (audioInputs.length > 0) {
        const savedDeviceId = localStorage.getItem('selectedAudioDevice');
        const deviceId = savedDeviceId && audioInputs.find(d => d.deviceId === savedDeviceId)
          ? savedDeviceId
          : audioInputs[0].deviceId;
        setSelectedAudioDevice(deviceId);
      }
    } catch (error) {
      console.error('初始化音频设备失败:', error);
    }
  };

  // 初始化视频设备
  const initializeVideoDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `摄像头 ${videoDevices.length + 1}`
        }));

      setVideoDevices(videoInputs);

      if (videoInputs.length > 0) {
        const savedDeviceId = localStorage.getItem('selectedVideoDevice');
        const deviceId = savedDeviceId && videoInputs.find(d => d.deviceId === savedDeviceId)
          ? savedDeviceId
          : videoInputs[0].deviceId;
        setSelectedVideoDevice(deviceId);
      }
    } catch (error) {
      console.error('初始化视频设备失败:', error);
    }
  };

  // 初始化设备
  const initializeDevices = async () => {
    try {
      // 分别检查音频和视频权限
      const audioPermission = await checkAudioPermission();
      const videoPermission = await checkVideoPermission();

      // 根据权限状态初始化相应的设备
      if (audioPermission) {
        await initializeAudioDevices();
      }
      if (videoPermission) {
        await initializeVideoDevices();
      }

      // 只要有任一权限就设置设备就绪
      setIsDevicesReady(audioPermission || videoPermission);

      // 获取媒体流
      const constraints: MediaStreamConstraints = {
        audio: audioPermission ? {
          deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false,
        video: videoPermission ? {
          deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      // 设置视频预览
      if (videoRef.current && videoPermission) {
        videoRef.current.srcObject = stream;
      }

      // 初始化音频分析器
      if (audioPermission) {
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const analyser = audioContext.createAnalyser();
        analyserRef.current = analyser;
        analyser.fftSize = 256;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
      }

      // 开始音频可视化
      if (audioPermission) {
        startAudioVisualization();
      }
    } catch (error) {
      console.error('初始化设备失败:', error);
    }
  };

  // 开始音频可视化
  const startAudioVisualization = () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
      const volume = Math.min(average / 128, 1);
      
      const visualizer = document.querySelector(`.${styles.audioVisualizer}`) as HTMLElement;
      if (visualizer) {
        visualizer.style.setProperty('--volume', volume.toString());
      }

      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };

    updateVolume();
  };

  // 处理设备变更
  const handleDeviceChange = async (type: 'audio' | 'video', deviceId: string) => {
    try {
      if (!mediaStreamRef.current) return;

      // 停止当前轨道
      mediaStreamRef.current.getTracks().forEach(track => {
        if ((type === 'audio' && track.kind === 'audio') || 
            (type === 'video' && track.kind === 'video')) {
          track.stop();
        }
      });

      // 获取新的媒体流
      const constraints: MediaStreamConstraints = {
        audio: type === 'audio' ? {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false,
        video: type === 'video' ? {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // 将新轨道添加到现有流中
      newStream.getTracks().forEach(track => {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.addTrack(track);
        }
      });

      // 更新视频预览
      if (type === 'video' && videoRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
      }

      // 重新初始化音频分析器
      if (type === 'audio' && audioContextRef.current && analyserRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(newStream);
        source.connect(analyserRef.current);
      }

      // 保存设备选择
      localStorage.setItem(`selected${type === 'audio' ? 'Audio' : 'Video'}Device`, deviceId);
    } catch (error) {
      console.error(`切换${type === 'audio' ? '音频' : '视频'}设备失败:`, error);
    }
  };

  // 切换音频状态
  const toggleAudio = () => {
    if (!mediaStreamRef.current) return;
    
    const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  // 切换视频状态
  const toggleVideo = () => {
    if (!mediaStreamRef.current) return;
    
    const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  // 加入会议
  const handleJoinMeeting = async () => {
    if (!roomId) return;
    
    try {
      // 设置加载状态
      setIsJoining(true);
      
      // 调用后端接口
      const response = await joinRoom({
        meetingNumber: roomId, // 使用 roomId 作为会议号
        userId: localStorage.getItem('userId') || '', // 从本地存储获取用户ID
        role: isHost ? 'Interviewer' : 'Candidate' // 根据isHost判断角色
      });
      
      // 检查响应是否成功
      if (response.success) {
        // 只保留必要的参数
        const params = new URLSearchParams();
        params.set('roomId', roomId);
        // 成功后跳转到会议页面
        navigate(`/playground?${params.toString()}`);
      } else {
        // 处理失败情况
        console.error('加入会议失败:', response.message);
        message.error(`加入会议失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      // 处理异常
      console.error('加入会议异常:', error);
      message.error('加入会议失败，请稍后重试');
    } finally {
      // 无论成功失败，都重置加载状态
      setIsJoining(false);
    }
  };

  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    initializeDevices();

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [roomId, navigate]);

  // 监听设备变化
  useEffect(() => {
    const handleDeviceChange = () => {
      initializeAudioDevices();
      initializeVideoDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  return (
    <div className={styles.container}>
      <Card className={styles.prepareCard}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 24, color: '#fff' }}>
          会议准备
        </Title>

        <div className={styles.videoContainer}>
          <video
            ref={videoRef}
            className={styles.videoPreview}
            autoPlay
            playsInline
            muted
          />
          <div className={styles.audioVisualizer} />
        </div>

        <div className={styles.controls}>
          <div className={styles.deviceSelectors}>
            {hasAudioPermission && (
              <Select
                value={selectedAudioDevice}
                onChange={(value) => handleDeviceChange('audio', value)}
                options={audioDevices.map(device => ({
                  value: device.deviceId,
                  label: device.label
                }))}
                placeholder="选择麦克风"
              />
            )}
            {hasVideoPermission && (
              <Select
                value={selectedVideoDevice}
                onChange={(value) => handleDeviceChange('video', value)}
                options={videoDevices.map(device => ({
                  value: device.deviceId,
                  label: device.label
                }))}
                placeholder="选择摄像头"
              />
            )}
          </div>

          <div className={styles.deviceControls}>
            <Button
              type={isAudioEnabled ? 'primary' : 'default'}
              icon={isAudioEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
              onClick={toggleAudio}
              disabled={!hasAudioPermission}
            >
              {isAudioEnabled ? '关闭麦克风' : '开启麦克风'}
            </Button>
            <Button
              type={isVideoEnabled ? 'primary' : 'default'}
              icon={isVideoEnabled ? <VideoCameraOutlined /> : <VideoCameraAddOutlined />}
              onClick={toggleVideo}
              disabled={!hasVideoPermission}
            >
              {isVideoEnabled ? '关闭摄像头' : '开启摄像头'}
            </Button>
          </div>

          {(!hasAudioPermission || !hasVideoPermission) && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Text type="warning">
                {!hasAudioPermission && !hasVideoPermission ? '需要麦克风和摄像头权限' :
                 !hasAudioPermission ? '需要麦克风权限' : '需要摄像头权限'}
              </Text>
              <Tooltip
                title={
                  <div style={{ maxWidth: 300 }}>
                    <p>请按照以下步骤重新启用权限：</p>
                    <ol style={{ paddingLeft: 20, margin: '8px 0' }}>
                      <li>点击地址栏左侧的锁定图标</li>
                      <li>找到"麦克风"和"摄像头"权限设置</li>
                      <li>将权限设置为"允许"</li>
                      <li>刷新页面</li>
                    </ol>
                    <p>如果仍然无法访问，请检查系统设置中的隐私权限。</p>
                  </div>
                }
              >
                <Button type="link" style={{ marginLeft: 8 }}>
                  如何解决？
                </Button>
              </Tooltip>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button
              type="primary"
              size="large"
              onClick={handleJoinMeeting}
              disabled={!isDevicesReady || isJoining}
              loading={isJoining}
            >
              加入会议
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MeetingPrepare; 