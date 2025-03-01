import React, { createContext, useContext, useState, useRef } from 'react';
import { useSettings } from './SettingsContext';
import { useApp } from './AppContext';
import { fetchChatCompletion, fetchStreamingChatCompletion } from '../services/openai';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const { settings } = useSettings();
  const app = useApp();
  const abortControllerRef = useRef(null);

  const sendMessage = async (message, sessionMessages, selectedConfig, callback) => {
    setIsLoading(true);
    setIsStreaming(true);
    try {
      // 创建新的AbortController用于取消请求
      abortControllerRef.current = new AbortController();
      
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
        totalVersions: 1, // 总版本数
        configName: config.name, // 存储当前使用的API组名称
        modelName: config.model // 存储当前使用的模型名称
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
        },
        abortControllerRef.current.signal
      );
      
      // 流式输出完成后，更新最终消息并移除流式标记
      // 将完成的回复添加到versions数组中
      const finalAssistantMessage = {
        ...assistantMessage,
        content: fullContent,
        isStreaming: false,
        versions: [{ 
          content: fullContent, 
          timestamp: Date.now(),
          configName: config.name, // 存储API组名称在版本信息中
          modelName: config.model  // 存储模型名称在版本信息中
        }]
      };
      
      const finalMessages = [
        ...updatedMessages,
        finalAssistantMessage
      ];
      
      callback(finalMessages);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('请求被用户取消');
        // 如果是因为用户取消导致的中断，不显示错误消息，而是保留当前生成的内容
        return;
      }

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
          versions: [{ 
            content: `发生错误: ${error.message}。请检查您的API密钥和网络连接。`, 
            timestamp: Date.now(),
            configName: selectedConfig?.name || "未知", // 存储API组名称
            modelName: selectedConfig?.model || "未知"  // 存储模型名称
          }],
          currentVersionIndex: 0,
          totalVersions: 1,
          configName: selectedConfig?.name || "未知", // 存储API组名称
          modelName: selectedConfig?.model || "未知"  // 存储模型名称
        },
      ];
      callback(errorMessages);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // 停止AI生成回复
  const stopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  // 添加重新生成回复功能
  const regenerateResponse = async (sessionId, messageIndex = -1, currentConfigName = null, currentModelName = null) => {
    if (!app || !app.sessions) return;
    
    const session = app.sessions.find(s => s.id === sessionId);
    if (!session || session.messages.length < 2) return;
    
    setIsLoading(true);
    setIsStreaming(true);
    
    // 创建新的AbortController用于取消请求
    abortControllerRef.current = new AbortController();
    
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
      // 如果传入了当前UI选择的模型和配置，则优先使用这些
      let configIndex = session.configIndex !== undefined ? session.configIndex : 0;
      let modelName = session.modelName || (settings.apiConfigs[configIndex]?.model || 'gpt-3.5-turbo');
      
      // 如果传入了当前选择的配置名称，找到对应的索引
      if (currentConfigName) {
        const newConfigIndex = settings.apiConfigs.findIndex(config => config.name === currentConfigName);
        if (newConfigIndex !== -1) {
          configIndex = newConfigIndex;
        }
      }
      
      // 如果传入了当前选择的模型名称，使用它
      if (currentModelName) {
        modelName = currentModelName;
      }
      
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
      
      // 保存当前对话分支
      if (targetAssistantMessage.versions && targetAssistantMessage.versions.length > 0) {
        const currentVersionIndex = targetAssistantMessage.currentVersionIndex || 0;
        const currentVersion = targetAssistantMessage.versions[currentVersionIndex];
        
        // 只有当有后续消息存在时才创建分支
        if (subsequentMessages.length > 0) {
          targetAssistantMessage.branches.push({
            content: currentVersion.content,
            timestamp: currentVersion.timestamp,
            subsequentMessages: [...subsequentMessages],
            configName: currentVersion.configName, // 保存配置名称
            modelName: currentVersion.modelName    // 保存模型名称
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
        totalVersions: targetAssistantMessage.versions ? targetAssistantMessage.versions.length + 1 : 1,
        configName: configWithModel.name, // 存储当前使用的API组名称
        modelName: configWithModel.model // 存储当前使用的模型名称
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
        // 只传递到用户消息为止的消息历史
        [...previousMessages, userMessage].map(msg => ({ role: msg.role, content: msg.content })),
        (chunk, content) => {
          fullContent = content; // 保存完整内容
          // 每次收到新内容时更新消息
          const updatedAssistantMessage = {
            ...newAssistantMessage,
            content: content,
          };
          
          const latestMessages = [
            ...previousMessages, 
            userMessage,
            updatedAssistantMessage
          ];
          
          app.updateSessionMessages(sessionId, latestMessages, configIndex, modelName);
        },
        abortControllerRef.current.signal
      );
      
      // 流式输出完成后，更新最终消息并移除流式标记
      // 将新回复添加到versions数组的前面（因为我们想要显示最新的回复）
      const newVersions = [
        { 
          content: fullContent, 
          timestamp: Date.now(),
          configName: configWithModel.name, // 存储API组名称在版本信息中
          modelName: configWithModel.model  // 存储模型名称在版本信息中
        },
        ...(targetAssistantMessage.versions || [])
      ];
      
      const finalAssistantMessage = {
        ...newAssistantMessage,
        content: fullContent,
        isStreaming: false,
        versions: newVersions,
        currentVersionIndex: 0, // 显示最新的版本
        totalVersions: newVersions.length,
        configName: configWithModel.name, // 存储当前使用的API组名称
        modelName: configWithModel.model // 存储当前使用的模型名称
      };
      
      const finalMessages = [
        ...previousMessages,
        userMessage,
        finalAssistantMessage
      ];
      
      app.updateSessionMessages(sessionId, finalMessages, configIndex, modelName);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('重新生成请求被用户取消');
        return;
      }
      
      console.error('重新生成回复失败:', error);
      // 如果出错，恢复原来的消息
      const errorMessages = [
        ...session.messages.slice(0, messageIndex),
        {
          ...session.messages[messageIndex],
          content: `重新生成失败: ${error.message}。请检查您的API密钥和网络连接。`,
          isError: true
        }
      ];
      app.updateSessionMessages(sessionId, errorMessages, session.configIndex, session.modelName);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // 编辑用户消息并重新生成回复
  const editMessage = async (sessionId, messageIndex, newContent, currentConfigName = null, currentModelName = null) => {
    if (!app || !app.sessions) return;
    
    const session = app.sessions.find(s => s.id === sessionId);
    if (!session || !session.messages || messageIndex < 0 || messageIndex >= session.messages.length) return;
    
    // 确保要编辑的是用户消息
    const message = session.messages[messageIndex];
    if (message.role !== 'user') return;
    
    setIsLoading(true);
    setIsStreaming(true);
    
    // 创建新的AbortController用于取消请求
    abortControllerRef.current = new AbortController();
    
    try {
      // 复制消息数组
      const messages = [...session.messages];
      
      // 找到下一条AI回复消息（如果存在）
      let aiResponseIndex = -1;
      for (let i = messageIndex + 1; i < messages.length; i++) {
        if (messages[i].role === 'assistant') {
          aiResponseIndex = i;
          break;
        }
      }
      
      // 如果找不到AI回复，就只更新用户消息
      if (aiResponseIndex === -1) {
        // 复制用户消息，更新内容
        const updatedUserMessage = {
          ...message,
          content: newContent,
          timestamp: Date.now(),
          isEdited: true,
          versions: message.versions || [{ content: message.content, timestamp: message.timestamp }]
        };
        
        // 如果用户消息没有versions数组，创建一个并添加原始版本
        if (!updatedUserMessage.versions) {
          updatedUserMessage.versions = [{ content: message.content, timestamp: message.timestamp }];
        }
        // 添加新版本到versions数组
        updatedUserMessage.versions.unshift({ content: newContent, timestamp: Date.now() });
        updatedUserMessage.currentVersionIndex = 0;
        updatedUserMessage.totalVersions = updatedUserMessage.versions.length;
        
        // 更新消息数组中的用户消息
        messages[messageIndex] = updatedUserMessage;
        app.updateSessionMessages(sessionId, messages);
        return;
      }
      
      // 如果找到AI回复，则需要保存当前对话分支，更新用户消息，并重新生成AI回复
      const aiMessage = messages[aiResponseIndex];
      const subsequentMessages = messages.slice(aiResponseIndex + 1);
      
      // 如果AI消息没有分支数组，创建一个
      if (!aiMessage.branches) {
        aiMessage.branches = [];
      }
      
      // 保存当前对话分支
      if (aiMessage.versions && aiMessage.versions.length > 0) {
        const currentVersionIndex = aiMessage.currentVersionIndex || 0;
        const currentVersion = aiMessage.versions[currentVersionIndex];
        
        // 保存当前分支
        aiMessage.branches.push({
          userContent: message.content, // 保存原始用户消息内容
          content: currentVersion.content, // 保存当前AI回复内容
          timestamp: currentVersion.timestamp,
          subsequentMessages: [...subsequentMessages], // 保存后续消息
        });
      }
      
      // 更新用户消息
      const updatedUserMessage = {
        ...message,
        content: newContent,
        timestamp: Date.now(),
        isEdited: true,
        versions: message.versions || [{ content: message.content, timestamp: message.timestamp }]
      };
      
      // 如果用户消息没有versions数组，创建一个并添加原始版本
      if (!updatedUserMessage.versions) {
        updatedUserMessage.versions = [{ content: message.content, timestamp: message.timestamp }];
      }
      // 添加新版本到versions数组
      updatedUserMessage.versions.unshift({ content: newContent, timestamp: Date.now() });
      updatedUserMessage.currentVersionIndex = 0;
      updatedUserMessage.totalVersions = updatedUserMessage.versions.length;
      
      // 创建一个空的AI回复消息
      const newAssistantMessage = { 
        role: 'assistant', 
        content: '', 
        timestamp: Date.now(),
        isStreaming: true,
        // 保留之前的versions，并复制分支
        versions: [],
        branches: aiMessage.branches || [],
        currentVersionIndex: 0,
        currentBranchIndex: -1,
        totalVersions: 1,
        configName: aiMessage.configName, // 复制API组名称
        modelName: aiMessage.modelName // 复制模型名称
      };
      
      // 更新消息数组，保留到用户消息，添加新的AI回复消息，移除后续消息
      messages[messageIndex] = updatedUserMessage;
      messages[aiResponseIndex] = newAssistantMessage;
      const updatedMessages = messages.slice(0, aiResponseIndex + 1);
      
      // 更新UI
      app.updateSessionMessages(sessionId, updatedMessages);
      
      // 获取与会话相关的配置和模型
      // 如果传入了当前UI选择的模型和配置，则优先使用这些
      let configIndex = session.configIndex !== undefined ? session.configIndex : 0;
      let modelName = session.modelName || (settings.apiConfigs[configIndex]?.model || 'gpt-3.5-turbo');
      
      // 如果传入了当前选择的配置名称，找到对应的索引
      if (currentConfigName) {
        const newConfigIndex = settings.apiConfigs.findIndex(config => config.name === currentConfigName);
        if (newConfigIndex !== -1) {
          configIndex = newConfigIndex;
        }
      }
      
      // 如果传入了当前选择的模型名称，使用它
      if (currentModelName) {
        modelName = currentModelName;
      }
      
      const selectedConfig = settings.apiConfigs[configIndex] || settings.apiConfigs[0] || settings;
      const configWithModel = {
        ...selectedConfig,
        model: modelName
      };
      
      // 准备消息上下文
      const messagesToSend = updatedMessages.slice(0, aiResponseIndex);
      
      // 使用流式API获取新回复
      let fullContent = '';
      await fetchStreamingChatCompletion(
        configWithModel.apiKey,
        configWithModel.proxyUrl,
        configWithModel.model,
        messagesToSend.map(msg => ({ role: msg.role, content: msg.content })),
        (chunk, content) => {
          fullContent = content; // 保存完整内容
          // 每次收到新内容时更新消息
          const updatedAssistantMessage = {
            ...newAssistantMessage,
            content: content,
          };
          
          const latestMessages = [...updatedMessages];
          latestMessages[aiResponseIndex] = updatedAssistantMessage;
          app.updateSessionMessages(sessionId, latestMessages, configIndex, modelName);
        },
        abortControllerRef.current.signal
      );
      
      // 流式输出完成后，更新最终消息
      const finalAssistantMessage = {
        ...newAssistantMessage,
        content: fullContent,
        isStreaming: false,
        versions: [{ 
          content: fullContent, 
          timestamp: Date.now(),
          configName: configWithModel.name, // 存储API组名称在版本信息中
          modelName: configWithModel.model  // 存储模型名称在版本信息中
        }],
        branches: aiMessage.branches || [],
        currentVersionIndex: 0,
        currentBranchIndex: -1,
        totalVersions: 1,
        configName: configWithModel.name, // 存储当前使用的API组名称
        modelName: configWithModel.model  // 存储当前使用的模型名称
      };
      
      // 更新消息
      const finalMessages = [...updatedMessages];
      finalMessages[aiResponseIndex] = finalAssistantMessage;
      app.updateSessionMessages(sessionId, finalMessages, configIndex, modelName);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('编辑消息后的请求被用户取消');
        return;
      }
      
      console.error('编辑消息失败:', error);
      // 处理错误
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
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
        // 确保分支中包含配置和模型信息
        if (!targetMessage.branches[existingBranchIndex].configName) {
          targetMessage.branches[existingBranchIndex].configName = currentVersion.configName || targetMessage.configName;
        }
        if (!targetMessage.branches[existingBranchIndex].modelName) {
          targetMessage.branches[existingBranchIndex].modelName = currentVersion.modelName || targetMessage.modelName;
        }
      } else {
        // 创建新分支，包含配置和模型信息
        targetMessage.branches.push({
          content: currentVersion.content,
          timestamp: currentVersion.timestamp,
          subsequentMessages: [...subsequentMessages],
          configName: currentVersion.configName || targetMessage.configName, // 保存配置名称
          modelName: currentVersion.modelName || targetMessage.modelName     // 保存模型名称
        });
      }
    }
    
    // 查找是否有与目标版本关联的分支
    let newSubsequentMessages = [];
    const targetVersion = targetMessage.versions[versionIndex];
    const hasBranch = targetMessage.branches && 
                      targetMessage.branches.some((branch, idx) => {
                        if (branch.content === targetVersion.content) {
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
      content: targetVersion.content,
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

  // 切换用户消息版本
  const switchUserMessageVersion = (sessionId, versionIndex, messageIndex) => {
    const session = app.sessions.find(s => s.id === sessionId);
    if (!session || session.messages.length === 0) return;
    
    const messages = [...session.messages];
    
    // 检查目标索引是否有效
    if (messageIndex < 0 || messageIndex >= messages.length) {
      console.error('无效的消息索引');
      return;
    }
    
    const targetMessage = messages[messageIndex];
    
    // 确保这是用户消息，且有版本记录
    if (targetMessage.role !== 'user' || !targetMessage.versions || 
        versionIndex < 0 || versionIndex >= targetMessage.versions.length) {
      return;
    }
    
    // 更新当前显示的版本索引和内容
    const updatedMessage = {
      ...targetMessage,
      content: targetMessage.versions[versionIndex].content,
      currentVersionIndex: versionIndex,
    };
    
    // 更新消息
    messages[messageIndex] = updatedMessage;
    
    // 找到下一条AI回复消息（如果存在）
    let aiResponseIndex = -1;
    for (let i = messageIndex + 1; i < messages.length; i++) {
      if (messages[i].role === 'assistant') {
        aiResponseIndex = i;
        break;
      }
    }
    
    // 如果没有找到AI回复，则只更新用户消息
    if (aiResponseIndex === -1) {
      app.updateSessionMessages(sessionId, messages);
      return;
    }
    
    // 如果找到AI回复，查找是否有与当前用户消息版本关联的分支
    const aiMessage = messages[aiResponseIndex];
    
    // 查找是否有匹配的分支
    let matchedBranchIndex = -1;
    let branchSubsequentMessages = [];
    
    if (aiMessage.branches) {
      matchedBranchIndex = aiMessage.branches.findIndex(branch => 
        branch.userContent === targetMessage.versions[versionIndex].content
      );
      
      if (matchedBranchIndex >= 0) {
        branchSubsequentMessages = aiMessage.branches[matchedBranchIndex].subsequentMessages || [];
        // 更新当前分支索引
        aiMessage.currentBranchIndex = matchedBranchIndex;
      }
    }
    
    // 如果找到匹配的分支，使用该分支的AI回复
    if (matchedBranchIndex >= 0) {
      const branch = aiMessage.branches[matchedBranchIndex];
      
      // 更新AI回复消息
      const updatedAiMessage = {
        ...aiMessage,
        content: branch.content,
        currentBranchIndex: matchedBranchIndex,
      };
      
      messages[aiResponseIndex] = updatedAiMessage;
      
      // 截断到AI回复，然后添加分支中的后续消息
      const trimmedMessages = messages.slice(0, aiResponseIndex + 1);
      app.updateSessionMessages(sessionId, [...trimmedMessages, ...branchSubsequentMessages]);
    } else {
      // 检查是否有与当前用户消息版本关联的AI回复版本
      // 查找user版本索引对应的AI回复版本（如果存在）
      if (aiMessage.versions && aiMessage.versions.length > versionIndex) {
        // 为用户消息版本找到对应的AI回复版本
        const updatedAiMessage = {
          ...aiMessage,
          content: aiMessage.versions[versionIndex].content,
          currentVersionIndex: versionIndex,
          currentBranchIndex: -1  // 不是分支
        };
        
        messages[aiResponseIndex] = updatedAiMessage;
      }
      
      // 更新消息，保留AI回复
      app.updateSessionMessages(sessionId, messages);
    }
  };

  return (
    <ChatContext.Provider value={{ 
      isLoading, 
      isStreaming,
      sendMessage, 
      regenerateResponse, 
      switchResponseVersion, 
      editMessage, 
      switchUserMessageVersion,
      stopGenerating
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}