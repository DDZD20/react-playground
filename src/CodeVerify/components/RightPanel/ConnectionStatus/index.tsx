import React, { useState, useEffect } from 'react';
import { Alert, Button, Modal, Spin } from 'antd';
import { ReloadOutlined, DisconnectOutlined, CheckCircleOutlined } from '@ant-design/icons';
import styles from './index.module.scss';

interface ConnectionStatusProps {
  connected: boolean;
  reconnecting: boolean;
  onReconnect: () => void;
  connectionError?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connected,
  reconnecting,
  onReconnect,
  connectionError
}) => {
  const [showModal, setShowModal] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  
  // 当连接状态变化时更新UI
  useEffect(() => {
    if (!connected && !reconnecting) {
      // 连接断开且不在重连中，显示模态框
      setShowModal(true);
      setAlertVisible(true);
    } else if (connected) {
      // 连接恢复，关闭模态框，短暂显示连接成功提示
      setShowModal(false);
      if (alertVisible) {
        // 如果之前显示过断开提示，现在显示连接成功提示
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
      }
    }
  }, [connected, reconnecting]);

  const handleReconnect = () => {
    onReconnect();
  };

  return (
    <>
      {/* 连接状态顶部通知 */}
      {alertVisible && (
        <div className={styles.alertContainer}>
          {!connected && !reconnecting && (
            <Alert
              message="连接断开"
              description="与服务器的连接已断开，请检查您的网络连接。"
              type="error"
              icon={<DisconnectOutlined />}
              showIcon
              action={
                <Button size="small" danger onClick={handleReconnect}>
                  重新连接
                </Button>
              }
            />
          )}
          {!connected && reconnecting && (
            <Alert
              message="正在重新连接"
              description="正在尝试重新连接到服务器..."
              type="warning"
              icon={<Spin size="small" />}
              showIcon
            />
          )}
          {connected && (
            <Alert
              message="连接已恢复"
              description="已成功重新连接到服务器"
              type="success"
              icon={<CheckCircleOutlined />}
              showIcon
              closable
              onClose={() => setAlertVisible(false)}
            />
          )}
        </div>
      )}

      {/* 断开连接模态框 */}
      <Modal
        title="连接断开"
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowModal(false)}>
            稍后再试
          </Button>,
          <Button
            key="reconnect"
            type="primary"
            icon={<ReloadOutlined />}
            loading={reconnecting}
            onClick={handleReconnect}
          >
            重新连接
          </Button>
        ]}
      >
        <div className={styles.modalContent}>
          <DisconnectOutlined className={styles.disconnectIcon} />
          <p className={styles.modalText}>
            与服务器的连接已断开。这可能是由于网络问题或服务器维护导致的。
          </p>
          {connectionError && (
            <Alert message={`错误详情: ${connectionError}`} type="error" />
          )}
          <div className={styles.reconnectTips}>
            <p>您可以尝试:</p>
            <ul>
              <li>检查您的网络连接</li>
              <li>刷新页面</li>
              <li>点击"重新连接"按钮</li>
            </ul>
          </div>
          {reconnecting && (
            <div className={styles.reconnectingStatus}>
              <Spin /> <span>正在尝试重新连接...</span>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default ConnectionStatus; 