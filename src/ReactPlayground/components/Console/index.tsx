import React, { useState } from 'react';
import { Empty } from 'antd';
import styles from './styles.module.scss';

interface ConsoleProps {
  // 后续可添加实际功能需要的props
}

const Console: React.FC<ConsoleProps> = () => {
  // 模拟一些console输出数据
  const [logs] = useState([
    { type: 'log', content: 'React app initialized', timestamp: '10:23:45' },
    { type: 'info', content: 'Component mounted', timestamp: '10:23:46' },
    { type: 'warn', content: 'Missing prop: "id" is required', timestamp: '10:23:47' },
    { type: 'error', content: 'Failed to fetch data: Network Error', timestamp: '10:23:48' },
  ]);

  return (
    <div className={styles.consoleContainer}>
      <div className={styles.toolbar}>
        <button className={styles.clearButton}>Clear</button>
        <div className={styles.filterButtons}>
          <button className={`${styles.filterButton} ${styles.active}`}>All</button>
          <button className={styles.filterButton}>Errors</button>
          <button className={styles.filterButton}>Warnings</button>
        </div>
      </div>
      
      <div className={styles.logContainer}>
        {logs.length > 0 ? (
          logs.map((log, index) => (
            <div key={index} className={`${styles.logItem} ${styles[log.type]}`}>
              <span className={styles.timestamp}>{log.timestamp}</span>
              <span className={styles.logContent}>{log.content}</span>
            </div>
          ))
        ) : (
          <Empty description="No console output" />
        )}
      </div>
    </div>
  );
};

export default Console; 