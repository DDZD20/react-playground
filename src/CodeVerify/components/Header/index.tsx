import styles from './index.module.scss'

import { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlaygroundContext } from '../../PlaygroundContext';
import { DownloadOutlined, MoonOutlined, ShareAltOutlined, SunOutlined, UserOutlined } from '@ant-design/icons';
import { message, Avatar } from 'antd';
import copy from 'copy-to-clipboard';
import { downloadFiles } from '../../utils';
import ModelSelector from './ModelSelector';
import authService from '../../services/AuthService';
import { User } from '../../../api/types';

export default function Header() {
  const { files, theme, setTheme} = useContext(PlaygroundContext)
  const navigate = useNavigate();
  const location = useLocation(); // 获取当前路径信息
  const [user, setUser] = useState<User | null>(null);
  
  // 检查是否在首页
  const isHomePage = location.pathname === '/';
  
  // 跳转到主页
  const goToHomePage = () => {
    navigate('/');
  };

  // 处理头像点击事件
  const handleAvatarClick = () => {
    if (user) {
      // 已登录，直接进入个人中心
      navigate('/user');
    } else {
      // 未登录，进入登录页面
      navigate('/', { state: { showAuth: true } });
    }
  };

  // 获取用户信息
  useEffect(() => {
    // 使用AuthService获取用户信息
    const user = authService.getCurrentUser();
    if (user) {
      setUser(user);
    }
  }, []);

  // 根据用户名生成随机颜色作为头像背景色
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

  // 获取用户名首字母作为头像显示
  const getAvatarText = (name: string): string => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className={`${styles.header} ${isHomePage ? styles.homepageHeader : ''}`}>
      <div className={styles.logo} onClick={goToHomePage}>
        <div className={styles.logoShield}>
          <div className={styles.shieldIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 2ZM12 11.99H19C18.47 16.11 15.72 19.78 12 20.93V12H5V6.3L12 3.19V11.99Z" fill="currentColor" />
            </svg>
          </div>
          <div className={styles.codeIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 16L4 12L8 8L9.4 9.4L6.8 12L9.4 14.6L8 16ZM16 8L20 12L16 16L14.6 14.6L17.2 12L14.6 9.4L16 8Z" fill="currentColor" />
            </svg>
          </div>
        </div>
        
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>CodeVerify</h1>
          <h2 className={styles.subtitle}>反AI作弊编程面试平台</h2>
        </div>
      </div>
      <div className={styles.links}>
        {/* 只在非首页显示主题切换按钮 */}
        {!isHomePage && (
          <>
            {theme === 'light' && (
              <MoonOutlined
                title='切换暗色主题'
                className={styles.theme}
                onClick={() => setTheme('dark')}
              />
            )}
            {theme === 'dark' && (
              <SunOutlined
                title='切换亮色主题'
                className={styles.theme}
                onClick={() => setTheme('light')}
              />
            )}
            <ShareAltOutlined 
              title='分享链接'
              onClick={() => {
                copy(window.location.href);
                message.success('分享链接已复制。')
              }}
            />
            <DownloadOutlined 
              title='下载代码'
              onClick={async () => {
                await downloadFiles(files);
                message.success('下载完成')
              }}
            />
            <ModelSelector />
          </>
        )}
        
        {/* 用户头像 - 点击直接进入个人中心或登录页面 */}
        {user ? (
          user.avatar ? (
            <Avatar 
              src={user.avatar} 
              className={styles.userAvatar}
              onClick={handleAvatarClick}
            />
          ) : (
            <Avatar 
              style={{ 
                backgroundColor: getColorFromName(user.username),
                cursor: 'pointer'
              }} 
              className={styles.userAvatar}
              onClick={handleAvatarClick}
            >
              {getAvatarText(user.username)}
            </Avatar>
          )
        ) : (
          <Avatar 
            icon={<UserOutlined />} 
            className={styles.userAvatar} 
            onClick={handleAvatarClick}
          />
        )}
      </div>
    </div>
  )
}
