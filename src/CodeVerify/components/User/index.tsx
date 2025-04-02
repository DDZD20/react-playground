import React, { useState, useEffect } from 'react';
import { Tabs, Spin, message } from 'antd';
import { UserOutlined, SettingOutlined, HistoryOutlined } from '@ant-design/icons';
import UserProfile from './UserProfile';
import UserSettings from './UserSettings';
import { User } from '../../../api/types';
import { getCurrentUser } from '../../../api/user';
import styles from './index.module.scss';

const { TabPane } = Tabs;

const UserPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await getCurrentUser();
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          message.error('获取用户信息失败');
        }
      } catch (error) {
        message.error(`加载用户信息出错: ${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="加载用户信息..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.errorContainer}>
        <h2>无法加载用户信息</h2>
        <p>请确保您已登录并刷新页面重试。</p>
      </div>
    );
  }

  return (
    <div className={styles.userPageContainer}>
      <Tabs activeKey={activeTab} onChange={handleTabChange} className={styles.tabs}>
        <TabPane 
          tab={<span><UserOutlined /> 个人资料</span>} 
          key="profile"
        >
          <UserProfile />
        </TabPane>
        
        <TabPane 
          tab={<span><HistoryOutlined /> 活动历史</span>} 
          key="history"
        >
          <div className={styles.comingSoon}>
            <h2>功能即将推出</h2>
            <p>活动历史功能正在开发中，敬请期待！</p>
          </div>
        </TabPane>
        
        <TabPane 
          tab={<span><SettingOutlined /> 账号设置</span>} 
          key="settings"
        >
          <UserSettings user={user} />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default UserPage; 