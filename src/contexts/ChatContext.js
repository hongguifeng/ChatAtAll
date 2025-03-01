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
  const regenerateResponse = async (sessionId, messageIndex = -1) => {
    if (!app || !app.sessions) return;
    
    const session = app.sessions.find(s => s.id === sessionId);
    if (!session || session.messages.length < 2) return;
    
    setIsLoading(true);
    
    try {
      // 如果提供了具体的messageIndex，就使用它；否则使用最后一条消息
      const targetMessageIndex = messageIndex >= 0 ? messageIndex : (session.messages.length - 1);
      
      // 检查目标消息是否是AI回复
      if (targetMessageIndex < 0 || targetMessageIndex >= session.messages.length || 
          session.messages[targetMessageIndex].role !== 'assistant') {
        console.error('无法重新生成：目标消息不是AI回复');
        return;
      }
      
      // 找到该AI回复对应的上一条用户消息
      let correspondingUserMessageIndex = -1;
      for (let i = targetMessageIndex - 1; i >= 0; i--) {
        if (session.messages[i].role === 'user') {
          correspondingUserMessageIndex = i;
          break;
        }
      }
      
      if (correspondingUserMessageIndex === -1) {
        console.error('无法重新生成：找不到对应的用户消息');
        return;
      }
      
      // 获取对应的用户消息和之前的所有消息
      const userMessage = session.messages[correspondingUserMessageIndex];
      const previousMessages = session.messages.slice(0, correspondingUserMessageIndex);
      
      // 获取与会话相关的配置和模型
      const configIndex = session.configIndex !== undefined ? session.configIndex : 0;
      const modelName = session.modelName || (settings.apiConfigs[configIndex]?.model || 'gpt-3.5-turbo');
      const selectedConfig = settings.apiConfigs[configIndex] || settings.apiConfigs[0] || settings;
      const configWithModel = {
        ...selectedConfig,
        model: modelName
      };
      
      // 保存当前消息和后续消息作为一个分支
      const targetAssistantMessage = session.messages[targetMessageIndex];
      const subsequentMessages = session.messages.slice(targetMessageIndex + 1);
      
      // 如果之前没有分支数据，创建一个分支对象
      if (!targetAssistantMessage.branches) {
        targetAssistantMessage.branches = [];
      }
      
      // 保存当前内容和后续消息作为一个分支
      if (targetAssistantMessage.versions && targetAssistantMessage.versions.length > 0) {
        const currentVersionIndex = targetAssistantMessage.currentVersionIndex || 0;
        const currentVersion = targetAssistantMessage.versions[currentVersionIndex];
        
        // 只有当有后续消息存在时才创建分支
        if (subsequentMessages.length > 0) {
          targetAssistantMessage.branches.push({
            content: currentVersion.content,
            timestamp: currentVersion.timestamp,
            subsequentMessages: [...subsequentMessages],
          });
        }
      }
      
      // 创建一个空的AI回复消息用于新生成的回复
      const newAssistantMessage = { 
        role: 'assistant', 
        content: '', 
        timestamp: Date.now(),
        isStreaming: true,
        // 保留之前的versions，并复制currentVersionIndex和totalVersions
        versions: targetAssistantMessage.versions || [],
        branches: targetAssistantMessage.branches || [],
        currentVersionIndex: 0, // 新版本将是默认显示的版本（索引0）
        currentBranchIndex: -1, // 当前没有显示任何分支
        totalVersions: targetAssistantMessage.versions ? targetAssistantMessage.versions.length + 1 : 1
      };
      
      // 裁剪消息，只保留到当前要重新生成的AI消息
      const currentMessages = [...session.messages.slice(0, targetMessageIndex)];
      
      // 添加新的空消息占位
      currentMessages.push(newAssistantMessage);
      
      // 更新UI以显示正在加载的状态，移除后续消息
      app.updateSessionMessages(sessionId, currentMessages, configIndex, modelName);
      
      // 使用流式API获取新回复
      let fullContent = '';
      await fetchStreamingChatCompletion(
        configWithModel.apiKey,
        configWithModel.proxyUrl,
        configWithModel.model,
        [...previousMessages, userMessage].map(msg => ({ role: msg.role, content: msg.content })),
        (chunk, content) => {
          fullContent = content; // 保存完整内容
          // 每次收到新内容时更新消息
          const updatedAssistantMessage = {
            ...newAssistantMessage,
            content: content,
          };
          
          const updatedMessages = [...currentMessages];
          updatedMessages[updatedMessages.length - 1] = updatedAssistantMessage;
          app.updateSessionMessages(sessionId, updatedMessages, configIndex, modelName);
        }
      );
      
      // 流式输出完成后，更新最终消息并移除流式标记
      // 将新回复添加到versions数组的前面（因为我们想要显示最新的回复）
      const newVersions = [
        { content: fullContent, timestamp: Date.now() },
        ...(targetAssistantMessage.versions || [])
      ];
      
      const finalAssistantMessage = {
        ...newAssistantMessage,
        content: fullContent,
        isStreaming: false,
        versions: newVersions,
        branches: targetAssistantMessage.branches || [],
        currentVersionIndex: 0, // 默认显示最新生成的回复
        currentBranchIndex: -1, // 当前没有显示任何分支
        totalVersions: newVersions.length
      };
      
      const finalMessages = [...currentMessages];
      finalMessages[finalMessages.length - 1] = finalAssistantMessage;
      app.updateSessionMessages(sessionId, finalMessages, configIndex, modelName);
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
  const switchResponseVersion = (sessionId, versionIndex, messageIndex = -1) => {
    const session = app.sessions.find(s => s.id === sessionId);
    if (!session || session.messages.length === 0) return;
    
    const messages = [...session.messages];
    
    // 如果提供了具体的messageIndex，就使用它；否则使用最后一条消息
    const targetMessageIndex = messageIndex >= 0 ? messageIndex : (messages.length - 1);
    
    // 检查目标索引是否有效
    if (targetMessageIndex < 0 || targetMessageIndex >= messages.length) {
      console.error('无效的消息索引');
      return;
    }
    
    const targetMessage = messages[targetMessageIndex];
    
    if (targetMessage.role !== 'assistant' || !targetMessage.versions || 
        versionIndex < 0 || versionIndex >= targetMessage.versions.length) {
      return;
    }
    
    // 保存当前分支的后续消息（如果有的话）
    // 获取当前版本和后续消息
    const currentVersionIndex = targetMessage.currentVersionIndex || 0;
    const currentVersion = targetMessage.versions[currentVersionIndex];
    const subsequentMessages = messages.slice(targetMessageIndex + 1);
    
    // 如果当前版本有后续消息，保存为分支
    if (subsequentMessages.length > 0) {
      // 初始化分支数组（如果不存在）
      if (!targetMessage.branches) {
        targetMessage.branches = [];
      }
      
      // 检查是否已存在相同内容的分支
      const existingBranchIndex = targetMessage.branches.findIndex(branch => 
        branch.content === currentVersion.content
      );
      
      if (existingBranchIndex >= 0) {
        // 更新现有分支的后续消息
        targetMessage.branches[existingBranchIndex].subsequentMessages = [...subsequentMessages];
      } else {
        // 创建新分支
        targetMessage.branches.push({
          content: currentVersion.content,
          timestamp: currentVersion.timestamp,
          subsequentMessages: [...subsequentMessages],
        });
      }
    }
    
    // 查找是否有与目标版本关联的分支
    let newSubsequentMessages = [];
    const hasBranch = targetMessage.branches && 
                      targetMessage.branches.some((branch, idx) => {
                        if (branch.content === targetMessage.versions[versionIndex].content) {
                          newSubsequentMessages = branch.subsequentMessages;
                          // 保存当前分支索引
                          targetMessage.currentBranchIndex = idx;
                          return true;
                        }
                        return false;
                      });
    
    // 更新当前显示的版本索引和内容
    const updatedMessage = {
      ...targetMessage,
      content: targetMessage.versions[versionIndex].content,
      currentVersionIndex: versionIndex,
      // 如果没有找到匹配的分支，设置为-1
      currentBranchIndex: hasBranch ? targetMessage.currentBranchIndex : -1
    };
    
    // 更新消息
    messages[targetMessageIndex] = updatedMessage;
    
    // 根据是否有分支，决定是否添加后续消息
    if (hasBranch && newSubsequentMessages.length > 0) {
      // 截断到当前消息，然后添加分支中的后续消息
      const trimmedMessages = messages.slice(0, targetMessageIndex + 1);
      app.updateSessionMessages(sessionId, [...trimmedMessages, ...newSubsequentMessages]);
    } else {
      // 如果没有分支，则只更新当前消息，并移除所有后续消息
      app.updateSessionMessages(sessionId, messages.slice(0, targetMessageIndex + 1));
    }
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