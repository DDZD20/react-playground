import styles from './index.module.scss'

import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlaygroundContext } from '../../PlaygroundContext';
import { DownloadOutlined, MoonOutlined, ShareAltOutlined, SunOutlined } from '@ant-design/icons';
import { message } from 'antd';
import copy from 'copy-to-clipboard';
import { downloadFiles } from '../../utils';
import ModelSelector from './ModelSelector';

export default function Header() {
  const { files, theme, setTheme} = useContext(PlaygroundContext)
  const navigate = useNavigate();
  
  // 跳转到主页
  const goToHomePage = () => {
    navigate('/');
  };

  return (
    <div className={styles.header}>
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
      </div>
    </div>
  )
}
