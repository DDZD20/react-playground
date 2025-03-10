import { Allotment } from "allotment";
import 'allotment/dist/style.css';
import Header from "./components/Header";
import CodeEditor from "./components/CodeEditor";
import Preview from "./components/Preview";
import { useContext, useState } from "react";
import { PlaygroundContext } from "./PlaygroundContext";
import AISidebar from "./components/AISidebar";
import { AI_MODELS } from "./services/AIService";

import './index.scss';

export default function ReactPlayground() {
    const { 
        theme, 
        setTheme,
        currentModelId,
        setCurrentModelId
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
        {/* AI 模型选择下拉框 */}
        <div 
            className="model-selector-container"
            style={{
                position: 'absolute',
                top: '10px',
                right: '20px',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}
        >
            <label 
                htmlFor="model-selector"
                style={{
                    color: theme === 'dark' ? '#fff' : '#333',
                    fontSize: '14px'
                }}
            >
                AI 模型:
            </label>
            <select
                id="model-selector"
                value={currentModelId}
                onChange={(e) => setCurrentModelId(e.target.value)}
                style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: theme === 'dark' ? '1px solid #555' : '1px solid #ccc',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#333',
                    fontSize: '14px',
                    cursor: 'pointer'
                }}
            >
                {AI_MODELS.map(model => (
                    <option key={model.id} value={model.id} title={model.description}>
                        {model.name}
                    </option>
                ))}
            </select>
        </div>
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