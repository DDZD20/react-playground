import { useEffect, useState } from 'react';
import { Avatar, Card, Descriptions, Spin, Button, message, Divider, Typography } from 'antd';
import { UserOutlined, MailOutlined, CalendarOutlined, EditOutlined, LockOutlined } from '@ant-design/icons';
import { User } from '../../../api/types';
import authService from '../../services/AuthService';
import { formatDate } from '../../utils';
import styles from './UserProfile.module.scss';

const { Title } = Typography;

/**
 * 获取用户名首字母作为头像显示
 */
const getAvatarText = (name: string): string => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};

/**
 * 根据用户名生成随机颜色作为头像背景色
 */
const getColorFromName = (name: string): string => {
  if (!name) return '#1677ff';
  
  // 基于用户名生成一个简单的哈希值
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // 转换为HSL色彩空间颜色，固定饱和度和亮度，只变化色相
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
};

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = () => {
      try {
        setLoading(true);
        const userData = authService.getCurrentUser();
        if (userData) {
          setUser(userData);
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

  // 处理编辑个人资料
  const handleEditProfile = () => {
    message.info('编辑个人资料功能即将推出');
  };

  // 处理修改密码
  const handleChangePassword = () => {
    message.info('修改密码功能即将推出');
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
        <Title level={3}>无法加载用户信息</Title>
        <p>请确保您已登录并刷新页面重试。</p>
        <Button type="primary" onClick={() => window.location.reload()}>
          刷新页面
        </Button>
      </div>
    );
  }

  const avatarColor = getColorFromName(user.username);
  const avatarText = getAvatarText(user.username);

  return (
    <div className={styles.profileContainer}>
      <div className={styles.headerSection}>
        <div className={styles.avatarContainer}>
          {user.avatar ? (
            <Avatar 
              size={120} 
              src={user.avatar} 
              alt={user.username} 
            />
          ) : (
            <Avatar 
              size={120} 
              style={{ backgroundColor: avatarColor, fontSize: '48px' }}
            >
              {avatarText}
            </Avatar>
          )}
        </div>
        <div className={styles.userInfo}>
          <Title level={2}>{user.username}</Title>
          <p className={styles.subtitle}>{user.role === 'admin' ? '管理员' : '用户'}</p>
        </div>
      </div>

      <Divider />

      <Card title="个人资料" className={styles.profileCard}>
        <Descriptions bordered column={1}>
          <Descriptions.Item label={<><UserOutlined /> 用户名</>}>
            {user.username}
          </Descriptions.Item>
          <Descriptions.Item label={<><MailOutlined /> 电子邮箱</>}>
            {user.email}
          </Descriptions.Item>
          <Descriptions.Item label={<><CalendarOutlined /> 注册时间</>}>
            {formatDate(user.createdAt || new Date())}
          </Descriptions.Item>
          <Descriptions.Item label={<><CalendarOutlined /> 最后更新</>}>
            {formatDate(user.updatedAt || new Date())}
          </Descriptions.Item>
        </Descriptions>

        <div className={styles.actionsContainer}>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={handleEditProfile}
          >
            编辑个人资料
          </Button>
          <Button 
            icon={<LockOutlined />} 
            onClick={handleChangePassword}
          >
            修改密码
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default UserProfile; 