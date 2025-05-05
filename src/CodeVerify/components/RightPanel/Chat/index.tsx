import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Avatar, Tooltip, Spin } from 'antd';
import { SendOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import styles from './styles.module.scss';
import { ChatMessage } from '../../../../api/types';
import ConnectionStatus from '../ConnectionStatus';
import { socketService } from '../../../services/SocketService';
import { formatTime } from '../../../utils';
import { SocketEvent } from '../../../services/type';

interface ChatProps {
  interviewId: string;
  interviewerName?: string;
  userId: string;
  username: string;
}

const Chat: React.FC<ChatProps> = ({ interviewId, interviewerName = '面试官', userId, username }) => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [participants, setParticipants] = useState<{ id: string; name: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 监听socket消息、参与者、连接
  useEffect(() => {
    if (!interviewId || !userId || !username) return;
    setLoading(true);
    setConnected(false);
    setMessages([]);
    setParticipants([]);

    const handleNewMessage = (msg: ChatMessage) => {
      setMessages(prev => {
        // 避免重复（如本地已添加临时消息）
        if (msg.senderId === userId && msg.content && prev.some(m => m.content === msg.content && m.senderId === userId)) {
          return prev;
        }
        return [...prev, msg];
      });
    };
    const handleUserJoined = (data: any) => {
      setParticipants(prev => prev.find(p => p.id === data.userId) ? prev : [...prev, { id: data.userId, name: data.userName || '用户' }]);
    };
    const handleUserLeft = (data: any) => setParticipants(prev => prev.filter(p => p.id !== data.userId));
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleReconnect = () => setReconnecting(true);
    const handleReconnectError = () => setReconnecting(false);

    socketService.on(SocketEvent.NEW_MESSAGE, handleNewMessage);
    socketService.on(SocketEvent.USER_JOINED, handleUserJoined);
    socketService.on(SocketEvent.USER_LEFT, handleUserLeft);
    socketService.on(SocketEvent.CONNECT, handleConnect);
    socketService.on(SocketEvent.DISCONNECT, handleDisconnect);
    (socketService as any).on('reconnect_success', handleReconnect);
    (socketService as any).on('reconnect_error', handleReconnectError);

    try {
      socketService.joinRoom(interviewId, 'Interviewer');
      setConnected(true);
    } catch {
      setConnected(false);
    }
    setLoading(false);

    return () => {
      socketService.off(SocketEvent.NEW_MESSAGE, handleNewMessage);
      socketService.off(SocketEvent.USER_JOINED, handleUserJoined);
      socketService.off(SocketEvent.USER_LEFT, handleUserLeft);
      socketService.off(SocketEvent.CONNECT, handleConnect);
      socketService.off(SocketEvent.DISCONNECT, handleDisconnect);
      (socketService as any).off('reconnect_success', handleReconnect);
      (socketService as any).off('reconnect_error', handleReconnectError);
      socketService.leaveRoom();
    };
  }, [interviewId, userId, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    // 构造本地消息对象，立即渲染到 UI
    const tempMsg: ChatMessage = {
      id: `${Date.now()}_local`,
      roomId: interviewId,
      senderId: userId,
      senderName: username,
      content: inputValue,
      type: 'text',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    socketService.sendMessage(inputValue);
    setInputValue('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setInputValue(e.target.value);

  const handleReconnect = () => socketService.disconnect();

  if (loading) return <Spin style={{ marginTop: 80 }} />;

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <div className={styles.headerLeft}>
          <TeamOutlined style={{ fontSize: 22, color: '#1677ff', marginRight: 8 }} />
          <span className={styles.roomTitle}>面试聊天</span>
          <ConnectionStatus connected={connected} reconnecting={reconnecting} onReconnect={handleReconnect} />
        </div>
        <div className={styles.headerRight}>
          <Avatar.Group size="small">
            {participants.map(p => (
              <Tooltip title={p.name} key={p.id}><Avatar icon={<UserOutlined />} /></Tooltip>
            ))}
          </Avatar.Group>
          <span className={styles.onlineCount}>{participants.length}人在线</span>
        </div>
      </div>
      <div className={styles.messageContainer}>
        {messages.length === 0 && <div className={styles.emptyTip}>暂无消息，快来互动吧！</div>}
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === userId;
          return (
            <div key={msg.id || idx} className={isMe ? styles.myMessage : styles.otherMessage}>
              <Avatar
                className={styles.avatar}
                style={{ backgroundColor: isMe ? '#1677ff' : '#f5f5f5', color: isMe ? '#fff' : '#222' }}
                icon={<UserOutlined />}
              />
              <div className={styles.messageContentBox}>
                <div className={styles.messageHeader}>
                  <span className={styles.messageUser}>{msg.senderName || (isMe ? username : interviewerName)}</span>
                  <span className={styles.messageTime}>{formatTime(msg.createdAt)}</span>
                </div>
                <div className={styles.messageText}>{msg.content}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className={styles.inputArea}>
        <Input.TextArea
          value={inputValue}
          onChange={handleInputChange}
          onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="请输入消息..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          className={styles.inputBox}
        />
        <Button
          icon={<SendOutlined />}
          type="primary"
          onClick={handleSend}
          disabled={!inputValue.trim()}
          className={styles.sendButton}
        />
      </div>
    </div>
  );
};

export default Chat;