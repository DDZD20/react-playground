import ReactPlayground from './CodeVerify';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import HomePage from './CodeVerify/components/HomePage';
import UserPage from './CodeVerify/components/User';
import Header from './CodeVerify/components/Header';

import './App.scss';
import { PlaygroundProvider } from './CodeVerify/PlaygroundContext';

// 创建一个布局组件，包含Header和内容区域
// 这个布局会用于HomePage和UserPage
const Layout = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  return (
    <>
      <Header />
      <div className={`content-container ${isHomePage ? 'home-content' : ''}`}>
        <Outlet />
      </div>
    </>
  );
};

function App() {
  return (
    <Router>
      <PlaygroundProvider>
        <Routes>
          {/* 使用布局的路由 */}
          <Route path="/" element={<Layout />}>
            {/* 嵌套路由 */}
            <Route index element={<HomePage />} />
            <Route path="user" element={<UserPage />} />
          </Route>
          {/* 使用自己布局的路由 */}
          <Route path="/playground" element={<ReactPlayground />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PlaygroundProvider>
    </Router>
  )
}

export default App
