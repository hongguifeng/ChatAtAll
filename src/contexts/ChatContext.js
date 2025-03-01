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
      
      // 创建一个空的AI回复消息，包含versions数组用于存储多个回复版本
      const assistantMessage = { 
        role: 'assistant', 
        content: '', 
        timestamp: Date.now(),
        isStreaming: true, // 标记为正在流式输出
        versions: [], // 存储所有生成的回复版本
        currentVersionIndex: 0, // 当前显示的版本索引
        totalVersions: 1 // 总版本数
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
      // 将完成的回复添加到versions数组中
      const finalAssistantMessage = {
        ...assistantMessage,
        content: fullContent,
        isStreaming: false,
        versions: [{ content: fullContent, timestamp: Date.now() }]
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
          isError: true,
          versions: [{ content: `发生错误: ${error.message}。请检查您的API密钥和网络连接。`, timestamp: Date.now() }],
          currentVersionIndex: 0,
          totalVersions: 1
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
      
      // 保存当前的AI回复到versions中，而不是替换它
      const currentMessages = [...session.messages];
      const lastAssistantMessage = currentMessages[currentMessages.length - 1];
      
      // 创建一个空的AI回复消息用于新生成的回复
      const newAssistantMessage = { 
        role: 'assistant', 
        content: '', 
        timestamp: Date.now(),
        isStreaming: true,
        // 保留之前的versions，并复制currentVersionIndex和totalVersions
        versions: lastAssistantMessage.versions || [],
        currentVersionIndex: 0, // 新版本将是默认显示的版本（索引0）
        totalVersions: lastAssistantMessage.versions ? lastAssistantMessage.versions.length + 1 : 1
      };
      
      // 替换最后一条AI消息为新的空消息
      currentMessages[currentMessages.length - 1] = newAssistantMessage;
      
      // 更新UI以显示正在加载的状态
      app.updateSessionMessages(sessionId, currentMessages, configIndex, modelName);
      
      // 使用流式API获取新回复
      let fullContent = '';
      await fetchStreamingChatCompletion(
        configWithModel.apiKey,
        configWithModel.proxyUrl,
        configWithModel.model,
        [...previousMessages, lastUserMessage].map(msg => ({ role: msg.role, content: msg.content })),
        (chunk, content) => {
          fullContent = content; // 保存完整内容
          // 每次收到新内容时更新消息
          const updatedAssistantMessage = {
            ...newAssistantMessage,
            content: content,
          };
          
          currentMessages[currentMessages.length - 1] = updatedAssistantMessage;
          app.updateSessionMessages(sessionId, [...currentMessages], configIndex, modelName);
        }
      );
      
      // 流式输出完成后，更新最终消息并移除流式标记
      // 将新回复添加到versions数组的前面（因为我们想要显示最新的回复）
      const newVersions = [
        { content: fullContent, timestamp: Date.now() },
        ...(lastAssistantMessage.versions || [])
      ];
      
      const finalAssistantMessage = {
        ...newAssistantMessage,
        content: fullContent,
        isStreaming: false,
        versions: newVersions,
        currentVersionIndex: 0, // 默认显示最新生成的回复
        totalVersions: newVersions.length
      };
      
      currentMessages[currentMessages.length - 1] = finalAssistantMessage;
      app.updateSessionMessages(sessionId, [...currentMessages], configIndex, modelName);
    } catch (error) {
      console.error('重新生成回复失败:', error);
      // 处理错误情况
      const session = app.sessions.find(s => s.id === sessionId);
      if (session && session.messages.length > 0) {
        const lastMessage = session.messages[session.messages.length - 1];
        if (lastMessage.role === 'assistant') {
          const errorMessage = {
            ...lastMessage,
            content: `重新生成回复失败: ${error.message}`,
            isError: true,
            isStreaming: false
          };
          const updatedMessages = [...session.messages.slice(0, -1), errorMessage];
          app.updateSessionMessages(sessionId, updatedMessages);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 切换回复版本
  const switchResponseVersion = (sessionId, versionIndex) => {
    const session = app.sessions.find(s => s.id === sessionId);
    if (!session || session.messages.length === 0) return;
    
    const messages = [...session.messages];
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage.role !== 'assistant' || !lastMessage.versions || 
        versionIndex < 0 || versionIndex >= lastMessage.versions.length) {
      return;
    }
    
    // 更新当前显示的版本索引和内容
    const updatedMessage = {
      ...lastMessage,
      content: lastMessage.versions[versionIndex].content,
      currentVersionIndex: versionIndex
    };
    
    messages[messages.length - 1] = updatedMessage;
    app.updateSessionMessages(sessionId, messages);
  };

  return (
    <ChatContext.Provider value={{ isLoading, sendMessage, regenerateResponse, switchResponseVersion }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}