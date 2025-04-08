import React, { useContext, useEffect, useRef, useState } from 'react';
import { Empty } from 'antd';
import styles from './styles.module.scss';
import { PlaygroundContext } from '../../../PlaygroundContext';

interface ConsoleProps {
  // 后续可添加实际功能需要的props
}

type LogFilter = 'all' | 'error' | 'warning';

const Console: React.FC<ConsoleProps> = () => {
  const { consoleLogs, clearConsoleLogs } = useContext(PlaygroundContext);
  const [filter, setFilter] = useState<LogFilter>('all');
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  // 根据过滤器筛选日志
  const filteredLogs = consoleLogs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'error') return log.type === 'error';
    if (filter === 'warning') return log.type === 'warn';
    return true;
  });

  // 自动滚动到底部
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs.length]);

  // 处理清除按钮点击
  const handleClear = () => {
    clearConsoleLogs();
  };

  // 处理过滤器按钮点击
  const handleFilterChange = (newFilter: LogFilter) => {
    setFilter(newFilter);
  };

  return (
    <div className={styles.consoleContainer}>
      <div className={styles.toolbar}>
        <button className={styles.clearButton} onClick={handleClear}>Clear</button>
        <div className={styles.filterButtons}>
          <button 
            className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All
          </button>
          <button 
            className={`${styles.filterButton} ${filter === 'error' ? styles.active : ''}`}
            onClick={() => handleFilterChange('error')}
          >
            Errors
          </button>
          <button 
            className={`${styles.filterButton} ${filter === 'warning' ? styles.active : ''}`}
            onClick={() => handleFilterChange('warning')}
          >
            Warnings
          </button>
        </div>
      </div>
      
      <div className={styles.logContainer} ref={logContainerRef}>
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <div key={log.id} className={`${styles.logItem} ${styles[log.type]}`}>
              <span className={styles.timestamp}>{log.timestamp}</span>
              <span className={styles.logContent}>{log.content}</span>
            </div>
          ))
        ) : (
          <Empty description="控制台暂无输出" />
        )}
      </div>
      
      {/* 底部状态栏 */}
      <div className={styles.statusBar}>
        <span className={styles.statusItem}>
          共 {consoleLogs.length} 条日志
        </span>
        <span className={styles.statusItem}>
          错误: {consoleLogs.filter(log => log.type === 'error').length}
        </span>
        <span className={styles.statusItem}>
          警告: {consoleLogs.filter(log => log.type === 'warn').length}
        </span>
      </div>
    </div>
  );
};

export default Console; 