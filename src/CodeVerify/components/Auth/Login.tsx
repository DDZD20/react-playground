import React, { useState } from 'react';
import { LoginRequest } from '../../../api/types';
import { login } from '../../../api/user';
import styles from './index.module.scss';

interface LoginProps {
  onLoginSuccess: () => void;
  onRegisterClick: () => void; // 切换到注册页面
}

/**
 * 登录组件
 * 
 * 提供用户登录表单界面，支持用户名/密码登录以及第三方登录选项
 */
const Login: React.FC<LoginProps> = ({ onLoginSuccess, onRegisterClick }) => {
  // 表单状态
  const [formData, setFormData] = useState<LoginRequest>({
    username: '',
    password: ''
  });
  
  // 记住我选项
  const [rememberMe, setRememberMe] = useState(false);
  
  // 错误和加载状态
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 表单输入处理
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(''); // 用户输入时清除错误
  };

  // 登录请求处理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 表单验证
    if (!formData.username.trim() || !formData.password) {
      setError('请输入用户名和密码');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      const response = await login(formData);
      
      if (response.success) {
        // 记住我选项处理
        if (rememberMe) {
          localStorage.setItem('remember_username', formData.username);
        } else {
          localStorage.removeItem('remember_username');
        }
        
        onLoginSuccess(); // 登录成功回调
      } else {
        setError(response.message || '登录失败，请检查用户名和密码');
      }
    } catch (err) {
      setError('登录请求失败，请稍后再试');
      console.error('登录错误:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 第三方登录处理 - GitHub
  const handleGitHubLogin = () => {
    // 在这里添加GitHub OAuth逻辑，为将来扩展做准备
    alert('GitHub登录功能即将上线');
  };

  // 第三方登录处理 - Microsoft
  const handleMicrosoftLogin = () => {
    // 在这里添加Microsoft OAuth逻辑，为将来扩展做准备
    alert('Microsoft登录功能即将上线');
  };

  return (
    <div className={styles.authWrapper}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h2>欢迎回来</h2>
          <p>请登录您的账号</p>
        </div>
        
        {error && <div className={styles.authError}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div className={styles.formGroup}>
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="请输入用户名"
              disabled={isLoading}
              autoComplete="username"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="请输入密码"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>
          
          <div className={styles.formOptions}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                disabled={isLoading}
              />
              <span>记住我</span>
            </label>
            <a href="#" className={styles.forgotPassword}>忘记密码?</a>
          </div>
          
          <button 
            type="submit" 
            className={styles.authButton}
            disabled={isLoading}
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>
        
        <div className={styles.authDivider}>
          <span>或使用第三方账号登录</span>
        </div>
        
        <div className={styles.socialLogin}>
          <button 
            type="button" 
            className={`${styles.socialButton} ${styles.github}`}
            onClick={handleGitHubLogin}
            disabled={isLoading}
          >
            <i></i>
            GitHub
          </button>
          <button 
            type="button" 
            className={`${styles.socialButton} ${styles.microsoft}`}
            onClick={handleMicrosoftLogin}
            disabled={isLoading}
          >
            <i></i>
            Microsoft
          </button>
        </div>
        
        <div className={styles.authFooter}>
          <p>
            还没有账号? <button className={styles.linkButton} onClick={onRegisterClick}>立即注册</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 