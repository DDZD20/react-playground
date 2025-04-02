import React, { useState } from 'react';
import { Tabs, Card, Row, Col, Form, Input, Button, Upload, message, Switch, Divider } from 'antd';
import { UserOutlined, UploadOutlined, LockOutlined, SettingOutlined, BellOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { User } from '../../../api/types';
import styles from './UserSettings.module.scss';

const { TabPane } = Tabs;

interface UserSettingsProps {
  user: User;
}

const UserSettings: React.FC<UserSettingsProps> = ({ user }) => {
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 处理个人资料更新
  const handleProfileUpdate = async (values: any) => {
    try {
      setLoading(true);
      console.log('更新个人资料:', values);
      
      // 这里将来会添加实际的API调用
      
      message.success('个人资料更新成功');
    } catch (error) {
      message.error(`更新失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  // 处理密码更新
  const handlePasswordUpdate = async (values: any) => {
    try {
      setLoading(true);
      console.log('更新密码:', values);
      
      // 这里将来会添加实际的API调用
      
      message.success('密码更新成功');
      passwordForm.resetFields();
    } catch (error) {
      message.error(`更新失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  // 头像上传配置
  const uploadProps: UploadProps = {
    name: 'avatar',
    action: '/api/upload/avatar', // 将来需要替换为实际的API端点
    showUploadList: false,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件!');
      }
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('图片必须小于2MB!');
      }
      return isImage && isLt2M;
    },
    onChange(info) {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} 上传成功`);
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 上传失败`);
      }
    },
  };

  return (
    <div className={styles.settingsContainer}>
      <Tabs defaultActiveKey="profile">
        <TabPane 
          tab={<span><UserOutlined /> 个人资料</span>} 
          key="profile"
        >
          <Card className={styles.settingsCard}>
            <Form
              form={profileForm}
              layout="vertical"
              initialValues={{
                username: user.username,
                email: user.email,
              }}
              onFinish={handleProfileUpdate}
            >
              <Row gutter={24}>
                <Col span={24} md={8}>
                  <div className={styles.avatarSection}>
                    <div className={styles.avatarUpload}>
                      <Upload {...uploadProps}>
                        <div className={styles.uploadContainer}>
                          {user.avatar ? (
                            <img src={user.avatar} alt="头像" className={styles.avatar} />
                          ) : (
                            <div className={styles.avatarPlaceholder}>
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className={styles.uploadOverlay}>
                            <UploadOutlined />
                            <span>更换头像</span>
                          </div>
                        </div>
                      </Upload>
                    </div>
                    <p className={styles.uploadTip}>
                      支持 JPG, PNG 格式, 小于 2MB
                    </p>
                  </div>
                </Col>
                <Col span={24} md={16}>
                  <Form.Item
                    name="username"
                    label="用户名"
                    rules={[
                      { required: true, message: '请输入用户名' },
                      { min: 3, message: '用户名至少3个字符' }
                    ]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  
                  <Form.Item
                    name="email"
                    label="电子邮箱"
                    rules={[
                      { required: true, message: '请输入电子邮箱' },
                      { type: 'email', message: '请输入有效的电子邮箱' }
                    ]}
                  >
                    <Input placeholder="电子邮箱" />
                  </Form.Item>
                  
                  <Form.Item
                    name="bio"
                    label="个人简介"
                  >
                    <Input.TextArea 
                      placeholder="介绍一下自己吧..." 
                      rows={4}
                      maxLength={200}
                      showCount
                    />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={loading}
                    >
                      保存变更
                    </Button>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </TabPane>
        
        <TabPane 
          tab={<span><LockOutlined /> 安全设置</span>} 
          key="security"
        >
          <Card className={styles.settingsCard}>
            <h3>修改密码</h3>
            <Divider />
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordUpdate}
            >
              <Form.Item
                name="currentPassword"
                label="当前密码"
                rules={[{ required: true, message: '请输入当前密码' }]}
              >
                <Input.Password placeholder="当前密码" />
              </Form.Item>
              
              <Form.Item
                name="newPassword"
                label="新密码"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 8, message: '密码至少8个字符' }
                ]}
              >
                <Input.Password placeholder="新密码" />
              </Form.Item>
              
              <Form.Item
                name="confirmPassword"
                label="确认新密码"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: '请确认新密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="确认新密码" />
              </Form.Item>
              
              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                >
                  更新密码
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
        
        <TabPane 
          tab={<span><SettingOutlined /> 偏好设置</span>} 
          key="preferences"
        >
          <Card className={styles.settingsCard}>
            <h3>界面设置</h3>
            <Divider />
            <Form layout="vertical">
              <Form.Item 
                label="深色模式" 
                name="darkMode"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              
              <Form.Item 
                label="代码编辑器主题" 
                name="editorTheme"
              >
                <select className={styles.select}>
                  <option value="vs">明亮</option>
                  <option value="vs-dark">深色</option>
                  <option value="hc-black">高对比度</option>
                </select>
              </Form.Item>
              
              <Form.Item 
                label="代码字体大小" 
                name="fontSize"
              >
                <Input type="number" min={12} max={24} defaultValue={14} />
              </Form.Item>
            </Form>
            
            <h3 className={styles.sectionTitle}>
              <BellOutlined /> 通知设置
            </h3>
            <Divider />
            <Form layout="vertical">
              <Form.Item 
                label="电子邮件通知" 
                name="emailNotifications"
                valuePropName="checked"
              >
                <Switch defaultChecked />
              </Form.Item>
              
              <Form.Item 
                label="系统通知" 
                name="systemNotifications"
                valuePropName="checked"
              >
                <Switch defaultChecked />
              </Form.Item>
              
              <Form.Item>
                <Button type="primary">保存设置</Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default UserSettings; 