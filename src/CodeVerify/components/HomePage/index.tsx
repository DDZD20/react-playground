import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCodeBackground } from './useCodeBackground';
import { AuthContainer } from '../Auth';
import MeetingModal from './MeetingModal';
import './styles.css';
import authService from '../../services/AuthService';
import { createRoom, joinRoom } from '../../../api/room';
import type { UserRole } from '../../../api/types';
import { message } from '../Message';

// 导入图标
import { 
  SafetyCertificateOutlined, 
  TeamOutlined, 
  AreaChartOutlined, 
  CheckCircleOutlined,
  SyncOutlined,
  ApiOutlined,
  RobotOutlined,
  EyeOutlined,
  BarChartOutlined,
  CodeOutlined,
  SecurityScanOutlined,  
} from '@ant-design/icons';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { canvasRef, isLoaded } = useCodeBackground();
  
  // 创建视差效果的引用
  const parallaxRef = useRef<HTMLDivElement>(null);
  
  // 添加认证状态
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  // 添加箭头显示状态
  const [showArrow, setShowArrow] = useState(true);
  // 添加会议模态框状态
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  
  // 检查是否从头像点击过来需要显示登录框
  useEffect(() => {
    // 检查location.state中是否有showAuth属性
    if (location.state && location.state.showAuth) {
      setShowAuth(true);
      // 清除状态，避免刷新页面时重复显示
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  
  // 实现视差滚动效果
  useEffect(() => {
    const handleScroll = () => {
      if (!parallaxRef.current) return;
      
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.body.scrollHeight;
      
      // 当滚动超过第一屏或接近页面底部时隐藏箭头
      if (scrollPosition > windowHeight * 0.1 || 
          scrollPosition > documentHeight - windowHeight * 1.5) {
        setShowArrow(false);
      } else {
        setShowArrow(true);
      }
      
      const sections = parallaxRef.current.querySelectorAll('.parallax-section:not(.cta-section)');
      
      sections.forEach((section, index) => {
        const speed = 0.1 + (index * 0.05);
        // 确保不要应用过大的偏移量
        const maxOffset = 100; // 最大偏移量限制
        const yPos = Math.max(-maxOffset, Math.min(-(scrollPosition * speed), 0));
        (section as HTMLElement).style.transform = `translateY(${yPos}px)`;
      });
      
      // 触发背景动画
      const cards = document.querySelectorAll('.feature-card');
      cards.forEach((card) => {
        const cardTop = card.getBoundingClientRect().top;
        const triggerPoint = windowHeight * 0.8;
        
        if (cardTop < triggerPoint) {
          card.classList.add('animate');
        }
      });
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // 处理开始按钮点击
  const handleStart = () => {
    // 如果未登录，显示认证页面
    if (!isAuthenticated) {
      setShowAuth(true);
    } else {
      // 已登录，显示会议模态框
      setShowMeetingModal(true);
    }
  };
  
  // 处理认证成功
  const handleAuthSuccess = (isLogin: boolean) => {
    setIsAuthenticated(true);
    setShowAuth(false);
    
    // 可以根据是登录还是注册进行不同的处理
    console.log(isLogin ? '用户已登录' : '用户已注册并登录');
    
    // 认证成功后显示会议模态框
    setShowMeetingModal(true);
  };
  
  // 关闭认证页面
  const handleCloseAuth = () => {
    setShowAuth(false);
  };

  // 平滑滚动到底部
  const scrollToBottom = () => {
    const ctaSection = document.querySelector('.cta-section');
    
    if (ctaSection) {
      // 直接滚动到CTA区域，并将其置于视口的中央
      ctaSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'  // 将元素放在视口中央
      });
    } else {
      // 如果找不到CTA区域，则滚动到页面底部
      window.scrollTo({
        top: document.body.scrollHeight - window.innerHeight,
        behavior: 'smooth'
      });
    }
  };

  // 处理创建会议
  const handleCreateMeeting = async () => {
    // 获取当前用户信息
    const user = authService.getCurrentUser();
    if (!user) {
      message?.error('用户未登录，无法创建会议');
      return;
    }
    setShowMeetingModal(false);
    try {
      // 调用API创建房间
      const res = await createRoom({ userId: user.id });
      if (res.success) {
        const params = new URLSearchParams();
        params.set('meetingNumber', res.data.meetingNumber);
        message.success('创建会议成功！')
        navigate(`/meeting/prepare?${params.toString()}`);
      } else {
        message?.error(res.message || '创建会议失败');
      }
    } catch (err) {
      message?.error('创建会议异常');
    }
  };

  // 处理加入会议
  const handleJoinMeeting = async (meetingNumber: string) => {
    const user = authService.getCurrentUser();
    if (!user) {
      message?.error('用户未登录，无法加入会议');
      return;
    }
    setShowMeetingModal(false);
    try {
      // 默认角色：Candidate
      const role: UserRole = user.role || 'Candidate';
      const res = await joinRoom({ roomId: meetingNumber, userId: user.id, role });
      if (res.success) {
        const params = new URLSearchParams();
        params.set('meetingNumber', meetingNumber);
        message.success('加入会议成功！')
        navigate(`/meeting/prepare?${params.toString()}`);;
      } else {
        message?.error(res.message || '加入会议失败');
      }
    } catch (err) {
      message?.error('加入会议异常');
    }
  };

  return (
    <div className="home-container">
      <canvas ref={canvasRef} className="code-background"></canvas>
      
      {/* 认证页面 */}
      {showAuth && (
        <div className="auth-overlay">
          <div className="auth-modal">
            <button className="close-button" onClick={handleCloseAuth}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor" />
              </svg>
            </button>
            <AuthContainer onAuthSuccess={handleAuthSuccess} />
          </div>
        </div>
      )}
      
      {/* 会议模态框 */}
      <MeetingModal
        visible={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        onCreateMeeting={handleCreateMeeting}
        onJoinMeeting={handleJoinMeeting}
      />
      
      {/* 首页内容 */}
      <div ref={parallaxRef} className="scrollable-content">
        {/* 英雄区域 */}
        <section className="hero-section parallax-section">
          <div className={`hero-content ${isLoaded ? 'loaded' : ''}`}>
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
            
            <div className="hero-features">
              <div className="feature-brief">
                <SafetyCertificateOutlined className="brief-icon" />
                <span>AI检测技术</span>
              </div>
              <div className="feature-brief">
                <TeamOutlined className="brief-icon" />
                <span>实时协作</span>
              </div>
              <div className="feature-brief">
                <AreaChartOutlined className="brief-icon" />
                <span>全方位评估</span>
              </div>
            </div>
          </div>
        </section>
        
        {/* 悬浮下箭头 */}
        {showArrow && (
          <div className="floating-arrow" onClick={scrollToBottom}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="currentColor" />
            </svg>
          </div>
        )}
        
        {/* AI检测技术 */}
        <section className="feature-section parallax-section">
          <div className="section-content left-aligned">
            <h2 className="section-title">
              <SafetyCertificateOutlined /> AI检测技术
            </h2>
            <div className="feature-card glassmorphism">
              <div className="card-content">
                <h3 className="card-title">多维度分析编码行为，精准识别AI生成内容</h3>
                <p className="card-description">
                  在当今AI技术迅速发展的背景下，识别候选人是否使用AI辅助已成为技术面试的重要挑战。
                  CodeVerify采用多维度分析方法，全方位检测AI生成代码的特征。
                </p>
                
                <div className="feature-details">
                  <div className="detail-item">
                    <CheckCircleOutlined className="detail-icon" />
                    <div>
                      <h4>编码节奏分析</h4>
                      <p>实时监测编码速度、停顿模式和修改行为，AI生成的代码通常表现为不自然的输入模式</p>
                    </div>
                  </div>
                  
                  <div className="detail-item">
                    <RobotOutlined className="detail-icon" />
                    <div>
                      <h4>语法特征识别</h4>
                      <p>使用机器学习模型分析代码结构、命名风格和注释模式，识别AI生成内容的典型特征</p>
                    </div>
                  </div>
                  
                  <div className="detail-item">
                    <ApiOutlined className="detail-icon" />
                    <div>
                      <h4>智能比对技术</h4>
                      <p>与已知的AI模型输出库进行智能比对，发现与常见AI生成模式的相似性</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-image ai-detection-image"></div>
            </div>
          </div>
        </section>
        
        {/* 实时协作 */}
        <section className="feature-section parallax-section">
          <div className="section-content right-aligned">
            <h2 className="section-title">
              <TeamOutlined /> 实时协作
            </h2>
            <div className="feature-card glassmorphism">
              <div className="card-image collaboration-image"></div>
              <div className="card-content">
                <h3 className="card-title">面试官与候选人的无缝协作环境</h3>
                <p className="card-description">
                  CodeVerify提供业界领先的实时协作功能，创造接近面对面的编程面试体验。
                  面试官可实时观察候选人的编码过程，并进行及时交流和指导。
                </p>
                
                <div className="feature-details">
                  <div className="detail-item">
                    <SyncOutlined className="detail-icon" />
                    <div>
                      <h4>实时代码同步</h4>
                      <p>基于Yjs协议的实时文档同步技术，确保毫秒级的代码同步，无延迟观察编码全过程</p>
                    </div>
                  </div>
                  
                  <div className="detail-item">
                    <EyeOutlined className="detail-icon" />
                    <div>
                      <h4>代码行为追踪</h4>
                      <p>记录编辑历史、光标移动和停顿时间，帮助面试官了解候选人的思考过程</p>
                    </div>
                  </div>
                  
                  <div className="detail-item">
                    <CodeOutlined className="detail-icon" />
                    <div>
                      <h4>实时代码注释</h4>
                      <p>面试官可以对候选人的代码添加实时注释和建议，提供即时反馈和指导</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* 全方位评估 */}
        <section className="feature-section parallax-section">
          <div className="section-content left-aligned">
            <h2 className="section-title">
              <AreaChartOutlined /> 全方位评估
            </h2>
            <div className="feature-card glassmorphism">
              <div className="card-content">
                <h3 className="card-title">从代码质量到编码行为的综合能力分析</h3>
                <p className="card-description">
                  CodeVerify不仅关注最终代码的正确性，更注重评估候选人的整体编程素养和解决问题的过程。
                  我们提供多维度的评估指标，帮助招聘方做出更全面的判断。
                </p>
                
                <div className="feature-details">
                  <div className="detail-item">
                    <BarChartOutlined className="detail-icon" />
                    <div>
                      <h4>代码质量评估</h4>
                      <p>自动分析代码复杂度、可维护性、性能效率等关键指标，提供量化的代码质量评分</p>
                    </div>
                  </div>
                  
                  <div className="detail-item">
                    <SecurityScanOutlined className="detail-icon" />
                    <div>
                      <h4>安全和最佳实践</h4>
                      <p>检测常见的安全漏洞和编程陷阱，评估候选人对安全编码和最佳实践的理解程度</p>
                    </div>
                  </div>
                  
                  <div className="detail-item">
                    <AreaChartOutlined className="detail-icon" />
                    <div>
                      <h4>行为数据分析</h4>
                      <p>分析编码速度、修改模式、调试习惯等行为数据，全面评估编程习惯和问题解决能力</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-image assessment-image"></div>
            </div>
          </div>
        </section>
        
        {/* CTA 区域 */}
        <section className="cta-section parallax-section">
          <div className="cta-content glassmorphism">
            <h2>准备好开始编程之旅了吗？</h2>
            <p>CodeVerify为您提供最先进的编程面试平台，无论您是面试官还是求职者，都能获得公平、高效的面试体验。</p>
            <div className="cta-buttons">
              <button className="start-button" onClick={handleStart}>
                <span className="start-text">{isAuthenticated ? '进入工作区' : '开始体验'}</span>
                <span className="start-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z" fill="currentColor" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage; 