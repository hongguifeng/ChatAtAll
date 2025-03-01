import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useChat } from '../../contexts/ChatContext';
import { useSettings } from '../../contexts/SettingsContext';
import Message from './Message';
import InputArea from './InputArea';
import './ChatPanel.css';

const ChatPanel = ({ session }) => {
  const { updateSessionMessages } = useApp();
  const { isLoading, sendMessage } = useChat();
  const { settings } = useSettings();
  const [inputValue, setInputValue] = useState('');
  const [selectedConfigIndex, setSelectedConfigIndex] = useState(0);

  // 初始化选择的配置索引
  useEffect(() => {
    if (settings.apiConfigs && settings.apiConfigs.length > 0) {
      // 如果session中保存了上次使用的配置索引，则使用它
      if (session && session.configIndex !== undefined) {
        // 确保索引在有效范围内
        const validIndex = Math.min(session.configIndex, settings.apiConfigs.length - 1);
        setSelectedConfigIndex(validIndex);
      } else {
        setSelectedConfigIndex(0);
      }
    }
  }, [settings.apiConfigs, session]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !session) return;
    
    // 使用选中的API配置
    const selectedConfig = settings.apiConfigs[selectedConfigIndex];
    
    sendMessage(
      inputValue.trim(), 
      session.messages, 
      selectedConfig, // 传递选中的配置
      (updatedMessages) => {
        // 更新消息的同时保存使用的配置索引
        updateSessionMessages(session.id, updatedMessages, selectedConfigIndex);
      }
    );
    
    setInputValue('');
  };
  
  // 处理配置选择变化
  const handleConfigChange = (e) => {
    const newIndex = parseInt(e.target.value);
    setSelectedConfigIndex(newIndex);
  };

  if (!session) {
    return (
      <div className="chat-panel empty-state">
        <div className="empty-message">
          <h2>没有选择会话</h2>
          <p>请从侧边栏选择一个会话或创建新会话</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-header-main">
          <h2>{session.name}</h2>
          {settings.apiConfigs && settings.apiConfigs.length > 0 && (
            <div className="api-config-selector">
              <select 
                value={selectedConfigIndex} 
                onChange={handleConfigChange}
                className="config-select"
              >
                {settings.apiConfigs.map((config, index) => (
                  <option key={index} value={index}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      
      <div className="messages-container">
        {session.messages.length === 0 ? (
          <div className="welcome-message">
            <h2>欢迎使用ChatGPT客户端</h2>
            <p>开始发送消息与AI助手交流吧</p>
          </div>
        ) : (
          session.messages.map((message, index) => {
            const selectedConfig = settings.apiConfigs[selectedConfigIndex];
            return (
              <Message
                key={index}
                message={message}
                modelName={selectedConfig.model}
                configName={selectedConfig.name}
              />
            );
          })
        )}
      </div>
      
      <InputArea
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ChatPanel;