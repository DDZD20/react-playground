import React, { useState } from 'react';
import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import Preview from '../Preview';
import Console from '../Console';
import Chat from '../Chat';
import styles from './styles.module.scss';
import { CodeOutlined, ConsoleSqlOutlined, MessageOutlined } from '@ant-design/icons';

interface RightPanelProps {
  // 后续可添加实际功能需要的props
}

const RightPanel: React.FC<RightPanelProps> = () => {
  const [activeTab, setActiveTab] = useState('preview');

  // 模拟数据 - 实际应该从props或全局状态获取
  const mockInterviewId = "interview-123";
  const mockUserId = "user-456";
  const mockUsername = "测试用户";

  const items: TabsProps['items'] = [
    {
      key: 'preview',
      label: (
        <span>
          <CodeOutlined />
          预览
        </span>
      ),
      children: <Preview />,
    },
    {
      key: 'console',
      label: (
        <span>
          <ConsoleSqlOutlined />
          控制台
        </span>
      ),
      children: <Console />,
    },
    {
      key: 'chat',
      label: (
        <span>
          <MessageOutlined />
          聊天
        </span>
      ),
      children: <Chat 
        interviewId={mockInterviewId} 
        userId={mockUserId} 
        username={mockUsername} 
      />,
    },
  ];

  return (
    <div className={styles.rightPanelContainer}>
      <Tabs
        activeKey={activeTab}
        items={items}
        onChange={setActiveTab}
        type="card"
        className={styles.tabs}
      />
    </div>
  );
};

export default RightPanel; 