import React from 'react';

/**
 * 仿 AudioOutlined 风格（白描边）麦克风音量动态图标
 * @param level 0~255 音量等级
 * @param muted 是否静音
 * @param size 图标大小
 */
const MicLevelIcon: React.FC<{ level: number; muted: boolean; size?: number }> = ({ level, muted, size = 28 }) => {
  // 0~255 映射到 0~1
  const percent = muted ? 0 : Math.min(1, level / 180);
  // 波浪线颜色
  const arcColor = muted ? '#bbb' : percent > 0.6 ? '#52c41a' : percent > 0.2 ? '#a0d911' : '#fff';
  // 主体描边色
  const strokeColor = '#fff';
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024">
      {/* 话筒主体轮廓 */}
      <path d="M512 672c-70.7 0-128-57.3-128-128V288c0-70.7 57.3-128 128-128s128 57.3 128 128v256c0 70.7-57.3 128-128 128z"
        fill={muted ? '#bbb' : 'none'} stroke={strokeColor} strokeWidth="64" />
      {/* 填充主体（可选：激活时填充）*/}
      {!muted && <path d="M512 672c-70.7 0-128-57.3-128-128V288c0-70.7 57.3-128 128-128s128 57.3 128 128v256c0 70.7-57.3 128-128 128z" fill="#fff" fillOpacity={percent * 0.7 + 0.1} />}
      {/* 动态音量波浪（白描边风格）*/}
      {!muted && (
        <>
          {percent > 0.2 && <path d="M700 512c0-104.6-84.9-189.5-189.5-189.5" stroke={arcColor} strokeWidth="72" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          {percent > 0.5 && <path d="M824 512c0-172.6-140-312.5-312.5-312.5" stroke={arcColor} strokeWidth="48" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        </>
      )}
      {/* 静音红杠 */}
      {muted && (
        <line x1="250" y1="250" x2="774" y2="774" stroke="#f5222d" strokeWidth="64" strokeLinecap="round" />
      )}
      底座（白描边）
      <rect x="448" y="768" width="128" height="96" rx="32" fill="none" stroke={strokeColor} strokeWidth="40" />
      <rect x="384" y="896" width="256" height="48" rx="24" fill="none" stroke={strokeColor} strokeWidth="32" />
    </svg>
  );
};

export default MicLevelIcon;
