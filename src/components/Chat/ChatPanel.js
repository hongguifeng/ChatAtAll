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
  const [selectedModel, setSelectedModel] = useState('');

  // 初始化选择的配置索引和模型
  useEffect(() => {
    if (settings.apiConfigs && settings.apiConfigs.length > 0) {
      // 如果session中保存了上次使用的配置索引，则使用它
      if (session && session.configIndex !== undefined) {
        // 确保索引在有效范围内
        const validIndex = Math.min(session.configIndex, settings.apiConfigs.length - 1);
        setSelectedConfigIndex(validIndex);
        
        // 初始化选中的模型
        if (session.modelName) {
          setSelectedModel(session.modelName);
        } else {
          // 使用当前配置的默认模型
          const currentConfig = settings.apiConfigs[validIndex];
          setSelectedModel(currentConfig.model);
        }
      } else {
        // 没有保存的配置索引，使用默认值
        setSelectedConfigIndex(0);
        const currentConfig = settings.apiConfigs[0];
        setSelectedModel(currentConfig.model);
      }
    }
  }, [settings.apiConfigs, session]); // 移除selectedConfigIndex依赖

  const handleSendMessage = () => {
    if (!inputValue.trim() || !session) return;
    
    // 使用选中的API配置
    const selectedConfig = settings.apiConfigs[selectedConfigIndex];
    // 创建一个配置副本，并使用选中的模型
    const configWithModel = {
      ...selectedConfig,
      model: selectedModel
    };
    
    sendMessage(
      inputValue.trim(), 
      session.messages, 
      configWithModel, // 传递带有选中模型的配置
      (updatedMessages) => {
        // 更新消息的同时保存使用的配置索引和模型
        updateSessionMessages(session.id, updatedMessages, selectedConfigIndex, selectedModel);
      }
    );
    
    setInputValue('');
  };
  
  // 处理配置选择变化
  const handleConfigChange = (e) => {
    const newIndex = parseInt(e.target.value);
    setSelectedConfigIndex(newIndex);
    // 切换配置时，默认使用该配置的模型
    const newConfig = settings.apiConfigs[newIndex];
    setSelectedModel(newConfig.model);
  };
  
  // 处理模型选择变化
  const handleModelChange = (e) => {
    setSelectedModel(e.target.value);
  };
  
  // 获取当前配置可用的所有模型
  const getAvailableModels = () => {
    if (!settings.apiConfigs || settings.apiConfigs.length === 0) return [];
    
    const currentConfig = settings.apiConfigs[selectedConfigIndex];
    const defaultModels = [
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o-mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
    ];
    
    const customModels = currentConfig.customModels?.map(model => ({ id: model, name: model })) || [];
    
    return [...defaultModels, ...customModels];
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
              
              <select
                value={selectedModel}
                onChange={handleModelChange}
                className="model-select"
              >
                {getAvailableModels().map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
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
                modelName={selectedModel}
                configName={selectedConfig.name}
                index={index}
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