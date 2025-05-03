import { useState } from 'react';
import { Modal, Radio, Form, Input, Button } from 'antd';
import type { RadioChangeEvent } from 'antd';
import { VideoCameraOutlined, TeamOutlined } from '@ant-design/icons';
import styles from './index.module.scss';

interface MeetingModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateMeeting: (name: string, password?: string) => void;
  onJoinMeeting: (roomId: string, password?: string) => void;
}

const MeetingModal: React.FC<MeetingModalProps> = ({
  visible,
  onClose,
  onCreateMeeting,
  onJoinMeeting,
}) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [form] = Form.useForm();

  const handleModeChange = (e: RadioChangeEvent) => {
    setMode(e.target.value as 'create' | 'join');
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (mode === 'create') {
        onCreateMeeting(values.password);
      } else {
        onJoinMeeting(values.roomId, values.password);
      }
      form.resetFields();
      onClose();
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  return (
    <Modal
      title="创建或加入会议"
      open={visible}
      onCancel={onClose}
      footer={null}
      className={styles.meetingModal}
      width={480}
      centered
    >
      <div className={styles.modeSelection}>
        <Radio.Group 
          value={mode} 
          onChange={handleModeChange}
          className={styles.modeGroup}
        >
          <Radio.Button value="create">
            <VideoCameraOutlined className={styles.modeIcon} />
            <span>创建会议</span>
          </Radio.Button>
          <Radio.Button value="join">
            <TeamOutlined className={styles.modeIcon} />
            <span>加入会议</span>
          </Radio.Button>
        </Radio.Group>
      </div>

      <Form
        form={form}
        layout="vertical"
        className={styles.meetingForm}
      >
        {mode === 'create' ? (
          <Form.Item
            name="password"
            label="会议密码（可选）"
          >
            <Input.Password placeholder="请输入会议密码" />
          </Form.Item>
        ) : (
          <>
            <Form.Item
              name="roomId"
              label="会议号"
              rules={[{ required: true, message: '请输入会议号' }]}
            >
              <Input placeholder="请输入6位会议号" maxLength={6} />
            </Form.Item>
            <Form.Item
              name="password"
              label="会议密码（可选）"
            >
              <Input.Password placeholder="请输入会议密码" />
            </Form.Item>
          </>
        )}

        <Form.Item className={styles.formActions}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            取消
          </Button>
          <Button type="primary" onClick={handleSubmit}>
            {mode === 'create' ? '创建' : '加入'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default MeetingModal; 