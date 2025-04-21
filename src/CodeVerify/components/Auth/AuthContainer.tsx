import { useState, useEffect } from 'react';
import Login from './Login';
import Register from './Register';
import authService from '../../services/AuthService';

interface AuthContainerProps {
  onAuthSuccess: (isLogin: boolean) => void;
}

/**
 * 认证容器组件
 * 
 * 管理登录和注册页面之间的切换，以及认证成功后的回调处理
 * 设计为可以轻松集成到不同页面，也便于将来扩展为其他认证提供商（如Auth0）
 */
const AuthContainer: React.FC<AuthContainerProps> = ({ onAuthSuccess }) => {
  // 是否显示登录（true）或注册（false）界面
  const [isLoginView, setIsLoginView] = useState(true);
  // 注册成功后的用户名，用于自动填充登录表单
  const [registeredUsername, setRegisteredUsername] = useState<string>('');
  
  // 检查用户是否已登录
  useEffect(() => {
    // 使用AuthService检查是否已认证
    if (authService.isAuthenticated()) {
      // 用户已登录，调用成功回调
      onAuthSuccess(true);
    }
  }, [onAuthSuccess]);
  
  // 登录成功处理
  const handleLoginSuccess = () => {
    onAuthSuccess(true);
  };
  
  // 注册成功处理
  const handleRegisterSuccess = (username: string) => {
    // 保存注册成功的用户名
    setRegisteredUsername(username);
    // 切换到登录视图
    setIsLoginView(true);
  };
  
  // 切换到登录视图
  const switchToLogin = () => {
    setIsLoginView(true);
  };
  
  // 切换到注册视图
  const switchToRegister = () => {
    setIsLoginView(false);
  };
  
  return (
    <>
      {isLoginView ? (
        <Login 
          onLoginSuccess={handleLoginSuccess}
          onRegisterClick={switchToRegister}
          defaultUsername={registeredUsername} // 传递注册成功的用户名
        />
      ) : (
        <Register 
          onRegisterSuccess={handleRegisterSuccess}
          onLoginClick={switchToLogin}
        />
      )}
    </>
  );
};

export default AuthContainer;