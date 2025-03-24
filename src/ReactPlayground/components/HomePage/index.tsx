import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCodeBackground } from './useCodeBackground';
import './styles.css';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { canvasRef, isLoaded } = useCodeBackground();
  
  // 处理开始按钮点击
  const handleStart = () => {
    navigate('/playground');
  };

  return (
    <div className="home-container">
      <canvas ref={canvasRef} className="code-background"></canvas>
      
      <div className={`content-wrapper ${isLoaded ? 'loaded' : ''}`}>
        <div className="logo-container">
          <div className="logo-shield">
            <div className="shield-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 2ZM12 11.99H19C18.47 16.11 15.72 19.78 12 20.93V12H5V6.3L12 3.19V11.99Z" fill="currentColor" />
              </svg>
            </div>
            <div className="code-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 16L4 12L8 8L9.4 9.4L6.8 12L9.4 14.6L8 16ZM16 8L20 12L16 16L14.6 14.6L17.2 12L14.6 9.4L16 8Z" fill="currentColor" />
              </svg>
            </div>
          </div>
        </div>
        
        <h1 className="title">CodeVerify</h1>
        <h2 className="subtitle">反AI作弊编程面试平台</h2>
        
        <div className="features">
          <div className="feature">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 11.99H19C18.47 16.11 15.72 19.78 12 20.93V12H5V6.3L12 3.19V11.99Z" fill="currentColor" />
              </svg>
            </div>
            <h3>AI检测技术</h3>
            <p>多维度分析编码行为，精准识别AI生成内容</p>
          </div>
          
          <div className="feature">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.5 12C17.88 12 19 10.88 19 9.5C19 8.12 17.88 7 16.5 7C15.12 7 14 8.12 14 9.5C14 10.88 15.12 12 16.5 12ZM9 11C10.66 11 12 9.66 12 8C12 6.34 10.66 5 9 5C7.34 5 6 6.34 6 8C6 9.66 7.34 11 9 11ZM16.5 14C14.67 14 11 14.92 11 16.75V19H22V16.75C22 14.92 18.33 14 16.5 14ZM9 13C6.67 13 2 14.17 2 16.5V19H9V16.75C9 15.9 9.33 14.41 11.37 13.28C10.5 13.1 9.66 13 9 13Z" fill="currentColor" />
              </svg>
            </div>
            <h3>实时协作</h3>
            <p>面试官可实时查看编码过程，添加注释</p>
          </div>
          
          <div className="feature">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z" fill="currentColor" />
              </svg>
            </div>
            <h3>全方位评估</h3>
            <p>从代码质量到编码行为的综合能力分析</p>
          </div>
        </div>
        
        <button className="start-button" onClick={handleStart}>
          <span className="start-text">开始体验</span>
          <span className="start-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z" fill="currentColor" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
};

export default HomePage; 