import React, { createContext, useContext, useState } from 'react';
import { useSettings } from './SettingsContext';
import { fetchChatCompletion } from '../services/openai';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const { settings } = useSettings();

  const sendMessage = async (message, sessionMessages, callback) => {
    setIsLoading(true);
    try {
      // 添加用户消息到历史记录
      const updatedMessages = [
        ...sessionMessages,
        { role: 'user', content: message, timestamp: Date.now() },
      ];
      
      // 首先更新UI以显示用户消息
      callback(updatedMessages);
      
      // 调用API获取回复
      const response = await fetchChatCompletion(
        settings.apiKey,
        settings.proxyUrl,
        settings.model,
        updatedMessages.map(msg => ({ role: msg.role, content: msg.content }))
      );
      
      // 添加AI回复到历史记录
      const finalMessages = [
        ...updatedMessages,
        { 
          role: 'assistant', 
          content: response, 
          timestamp: Date.now() 
        },
      ];
      
      // 更新UI显示完整对话
      callback(finalMessages);
    } catch (error) {
      console.error('发送消息失败:', error);
      // 添加错误消息
      const errorMessages = [
        ...sessionMessages,
        { role: 'user', content: message, timestamp: Date.now() },
        { 
          role: 'assistant', 
          content: `发生错误: ${error.message}。请检查您的API密钥和网络连接。`, 
          timestamp: Date.now(),
          isError: true
        },
      ];
      callback(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChatContext.Provider value={{ isLoading, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}