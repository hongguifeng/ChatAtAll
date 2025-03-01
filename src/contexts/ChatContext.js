import React, { createContext, useContext, useState } from 'react';
import { useSettings } from './SettingsContext';
import { useApp } from './AppContext';
import { fetchChatCompletion, fetchStreamingChatCompletion } from '../services/openai';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const { settings } = useSettings();
  const app = useApp();

  const sendMessage = async (message, sessionMessages, selectedConfig, callback) => {
    setIsLoading(true);
    try {
      // 添加用户消息到历史记录
      const updatedMessages = [
        ...sessionMessages,
        { role: 'user', content: message, timestamp: Date.now() },
      ];
      
      // 首先更新UI以显示用户消息
      callback(updatedMessages);
      
      // 使用选定的配置调用API获取回复
      const config = selectedConfig || settings.apiConfigs[0] || settings;
      
      // 创建一个空的AI回复消息
      const assistantMessage = { 
        role: 'assistant', 
        content: '', 
        timestamp: Date.now(),
        isStreaming: true // 标记为正在流式输出
      };
      
      // 添加初始空回复到历史记录
      const messagesWithEmptyReply = [...updatedMessages, assistantMessage];
      callback(messagesWithEmptyReply);
      
      // 使用流式API
      let fullContent = '';
      await fetchStreamingChatCompletion(
        config.apiKey,
        config.proxyUrl,
        config.model,
        updatedMessages.map(msg => ({ role: msg.role, content: msg.content })),
        (chunk, content) => {
          fullContent = content; // 保存完整内容
          // 每次收到新内容时更新消息
          const updatedAssistantMessage = {
            ...assistantMessage,
            content: content,
          };
          
          const latestMessages = [
            ...updatedMessages,
            updatedAssistantMessage
          ];
          
          callback(latestMessages);
        }
      );
      
      // 流式输出完成后，更新最终消息并移除流式标记
      const finalAssistantMessage = {
        ...assistantMessage,
        content: fullContent,
        isStreaming: false
      };
      
      const finalMessages = [
        ...updatedMessages,
        finalAssistantMessage
      ];
      
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

  // 添加重新生成回复功能
  const regenerateResponse = async (sessionId) => {
    if (!app || !app.sessions) return;
    
    const session = app.sessions.find(s => s.id === sessionId);
    if (!session || session.messages.length < 2) return;
    
    setIsLoading(true);
    
    try {
      // 获取最后一条用户消息的索引
      let lastUserMessageIndex = -1;
      for (let i = session.messages.length - 1; i >= 0; i--) {
        if (session.messages[i].role === 'user') {
          lastUserMessageIndex = i;
          break;
        }
      }
      
      if (lastUserMessageIndex === -1) return;
      
      // 获取最后一条用户消息和之前的所有消息
      const lastUserMessage = session.messages[lastUserMessageIndex];
      const previousMessages = session.messages.slice(0, lastUserMessageIndex);
      
      // 获取与会话相关的配置和模型
      const configIndex = session.configIndex !== undefined ? session.configIndex : 0;
      const modelName = session.modelName || (settings.apiConfigs[configIndex]?.model || 'gpt-3.5-turbo');
      const selectedConfig = settings.apiConfigs[configIndex] || settings.apiConfigs[0] || settings;
      const configWithModel = {
        ...selectedConfig,
        model: modelName
      };
      
      // 发送最后一条用户消息来获取新的回复
      sendMessage(
        lastUserMessage.content,
        previousMessages,
        configWithModel,
        (updatedMessages) => {
          app.updateSessionMessages(sessionId, updatedMessages, configIndex, modelName);
        }
      );
    } catch (error) {
      console.error('重新生成回复失败:', error);
    }
  };

  return (
    <ChatContext.Provider value={{ isLoading, sendMessage, regenerateResponse }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}