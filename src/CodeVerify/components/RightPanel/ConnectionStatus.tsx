import React from 'react';
import { Badge } from 'antd';

export interface ConnectionStatusProps {
  connected: boolean;
  reconnecting?: boolean;
  onReconnect?: () => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ connected, reconnecting, onReconnect }) => {
  return (
    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
      <Badge status={connected ? 'success' : 'error'} text={connected ? '在线' : '离线'} />
      {reconnecting && <span style={{ color: '#faad14' }}>正在重连...</span>}
      {!connected && onReconnect && (
        <a onClick={onReconnect} style={{ marginLeft: 8 }}>重试连接</a>
      )}
    </div>
  );
};

export default ConnectionStatus;
