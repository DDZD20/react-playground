import { useState } from 'react';
import { RegisterRequest } from '../../../api/types';
import { register } from '../../../api/user';
import styles from './index.module.scss';

interface RegisterProps {
  onRegisterSuccess: () => void;
  onLoginClick: () => void; // 切换到登录页面
}

/**
 * 注册组件
 * 
 * 提供用户注册表单界面，支持电子邮件注册以及第三方账号注册选项
 */
const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onLoginClick }) => {
  // 表单状态
  const [formData, setFormData] = useState<RegisterRequest & { confirmPassword: string }>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  // 错误和加载状态
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // 表单输入处理
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 清除特定字段错误
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // 清除一般错误
    if (error) setError('');
  };
  
  // 表单验证
  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;
    
    // 用户名验证
    if (!formData.username.trim()) {
      errors.username = '请输入用户名';
      isValid = false;
    } else if (formData.username.length < 3) {
      errors.username = '用户名至少需要3个字符';
      isValid = false;
    }
    
    // 邮箱验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = '请输入电子邮箱';
      isValid = false;
    } else if (!emailRegex.test(formData.email)) {
      errors.email = '请输入有效的电子邮箱';
      isValid = false;
    }
    
    // 密码验证
    if (!formData.password) {
      errors.password = '请输入密码';
      isValid = false;
    } else if (formData.password.length < 6) {
      errors.password = '密码至少需要6个字符';
      isValid = false;
    }
    
    // 确认密码验证
    if (!formData.confirmPassword) {
      errors.confirmPassword = '请确认密码';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
      isValid = false;
    }
    
    setFieldErrors(errors);
    return isValid;
  };
  
  // 注册请求处理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 表单验证
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      // 准备发送的数据（去除confirmPassword）
      const { confirmPassword, ...registerData } = formData;
      
      const response = await register(registerData);
      
      if (response.success) {
        onRegisterSuccess(); // 注册成功回调
      } else {
        setError(response.message || '注册失败，请稍后再试');
      }
    } catch (err) {
      setError('注册请求失败，请稍后再试');
      console.error('注册错误:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 第三方注册处理 - GitHub
  const handleGitHubRegister = () => {
    // 在这里添加GitHub OAuth注册逻辑，为将来扩展做准备
    alert('GitHub注册功能即将上线');
  };
  
  // 第三方注册处理 - Microsoft
  const handleMicrosoftRegister = () => {
    // 在这里添加Microsoft OAuth注册逻辑，为将来扩展做准备
    alert('Microsoft注册功能即将上线');
  };

  return (
    <div className={styles.authWrapper}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h2>创建新账号</h2>
          <p>填写以下信息完成注册</p>
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
            {fieldErrors.username && <div className={styles.fieldError}>{fieldErrors.username}</div>}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="email">电子邮箱</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="请输入电子邮箱"
              disabled={isLoading}
              autoComplete="email"
            />
            {fieldErrors.email && <div className={styles.fieldError}>{fieldErrors.email}</div>}
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
              autoComplete="new-password"
            />
            {fieldErrors.password && <div className={styles.fieldError}>{fieldErrors.password}</div>}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">确认密码</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="请再次输入密码"
              disabled={isLoading}
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword && (
              <div className={styles.fieldError}>{fieldErrors.confirmPassword}</div>
            )}
          </div>
          
          <button 
            type="submit" 
            className={styles.authButton}
            disabled={isLoading}
          >
            {isLoading ? '注册中...' : '注册'}
          </button>
        </form>
        
        <div className={styles.authDivider}>
          <span>或使用第三方账号注册</span>
        </div>
        
        <div className={styles.socialLogin}>
          <button 
            type="button" 
            className={`${styles.socialButton} ${styles.github}`}
            onClick={handleGitHubRegister}
            disabled={isLoading}
          >
            <i></i>
            GitHub
          </button>
          <button 
            type="button" 
            className={`${styles.socialButton} ${styles.microsoft}`}
            onClick={handleMicrosoftRegister}
            disabled={isLoading}
          >
            <i></i>
            Microsoft
          </button>
        </div>
        
        <div className={styles.authFooter}>
          <p>
            已有账号? <button className={styles.linkButton} onClick={onLoginClick}>立即登录</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register; 