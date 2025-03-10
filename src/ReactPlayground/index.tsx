import { Allotment } from "allotment";
import 'allotment/dist/style.css';
import Header from "./components/Header";
import CodeEditor from "./components/CodeEditor";
import Preview from "./components/Preview";
import { useContext, useState } from "react";
import { PlaygroundContext } from "./PlaygroundContext";
import AISidebar from "./components/AISidebar";

import './index.scss';

export default function ReactPlayground() {
    const { 
        theme, 
        setTheme, 
    } = useContext(PlaygroundContext);
    
    const [showAISidebar, setShowAISidebar] = useState(false);

    const toggleAISidebar = () => {
        setShowAISidebar(!showAISidebar);
    };

    return <div 
        className={theme}
        style={{height: '100vh'}}
    >
        <Header/>
        <div style={{ position: 'relative', height: 'calc(100% - 50px)' }}>
            <Allotment defaultSizes={[100, 100]}>
                <Allotment.Pane minSize={0}>
                    <CodeEditor />
                </Allotment.Pane>
                <Allotment.Pane minSize={0}>
                    <Preview />
                </Allotment.Pane>
            </Allotment>
            
            {/* AI 侧栏切换按钮 */}
            <button 
                className="ai-sidebar-toggle"
                onClick={toggleAISidebar}
                style={{
                    position: 'absolute',
                    right: showAISidebar ? '33.33%' : 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 100,
                    background: theme === 'dark' ? '#333' : '#f0f0f0',
                    border: 'none',
                    borderRadius: showAISidebar ? '4px 0 0 4px' : '4px',
                    padding: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 0 5px rgba(0,0,0,0.2)',
                    transition: 'right 0.3s ease'
                }}
            >
                {showAISidebar ? '>' : '<'}
            </button>
            
            {/* 只有在 showAISidebar 为 true 时才渲染 AI 侧栏 */}
            {showAISidebar && (
                <div 
                    className="ai-sidebar-container"
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        width: '33.33%',
                        height: '100%',
                        zIndex: 99
                    }}
                >
                    <AISidebar />
                </div>
            )}
        </div>
    </div>
}