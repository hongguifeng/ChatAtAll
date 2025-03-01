import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FaUser, FaRobot, FaRedoAlt, FaChevronLeft, FaChevronRight, FaCodeBranch, FaPen, FaCheck, FaTimes } from 'react-icons/fa';
import { useChat } from '../../contexts/ChatContext';
import { useApp } from '../../contexts/AppContext';

const Message = ({ message, modelName, configName, index }) => {
  const { role, content, timestamp, isError, versions, currentVersionIndex, totalVersions, branches, currentBranchIndex } = message;
  const isUser = role === 'user';
  const { regenerateResponse, switchResponseVersion, editMessage, switchUserMessageVersion } = useChat();
  const { currentSessionId } = useApp();
  
  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  
  // 计算导航信息
  const hasMultipleVersions = versions && versions.length > 1;
  const versionIndex = currentVersionIndex !== undefined ? currentVersionIndex : 0;
  const versionCount = totalVersions || (versions ? versions.length : 1);
  const canGoPrev = versionIndex > 0;
  const canGoNext = versionIndex < versionCount - 1;
  
  // 判断是否有分支
  const hasBranches = branches && branches.length > 0;
  // 当前是否在显示某个分支
  const isShowingBranch = currentBranchIndex !== undefined && currentBranchIndex >= 0;
  
  // 获取当前消息或版本的模型和配置名称
  const getCurrentModelAndConfig = () => {
    if (isUser) {
      // 用户消息使用传入的当前值
      return { displayModelName: modelName, displayConfigName: configName };
    }
    
    // 如果有多个版本，从当前版本获取
    if (versions && versions.length > 0 && versionIndex >= 0 && versionIndex < versions.length) {
      const currentVersion = versions[versionIndex];
      return { 
        displayModelName: currentVersion.modelName || message.modelName || modelName, 
        displayConfigName: currentVersion.configName || message.configName || configName 
      };
    }
    
    // 从消息本身获取
    return { 
      displayModelName: message.modelName || modelName, 
      displayConfigName: message.configName || configName 
    };
  };
  
  const { displayModelName, displayConfigName } = getCurrentModelAndConfig();
  
  const handlePrevVersion = () => {
    if (canGoPrev) {
      if (isUser) {
        switchUserMessageVersion(currentSessionId, versionIndex - 1, index);
      } else {
        switchResponseVersion(currentSessionId, versionIndex - 1, index);
      }
    }
  };
  
  const handleNextVersion = () => {
    if (canGoNext) {
      if (isUser) {
        switchUserMessageVersion(currentSessionId, versionIndex + 1, index);
      } else {
        switchResponseVersion(currentSessionId, versionIndex + 1, index);
      }
    }
  };

  // 切换编辑模式
  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(content);
  };

  // 提交编辑 - 使用当前选择的模型和配置
  const handleSubmitEdit = () => {
    // 传递当前界面上选择的模型和配置名称，而不是消息原始的配置
    editMessage(currentSessionId, index, editedContent, configName, modelName);
    setIsEditing(false);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(content);
  };
  
  // 重新生成 - 使用当前选择的模型和配置
  const handleRegenerate = () => {
    regenerateResponse(currentSessionId, index, configName, modelName);
  };
  
  // 代码高亮组件
  const CodeBlock = ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const codeString = String(children).replace(/\n$/, '');
    
    // 复制代码到剪贴板
    const copyToClipboard = (text) => {
      navigator.clipboard.writeText(text).then(
        () => {
          // 复制成功提示
          const button = document.activeElement;
          if (button) {
            const originalText = button.textContent;
            button.textContent = '已复制!';
            setTimeout(() => {
              button.textContent = originalText;
            }, 2000);
          }
        },
        (err) => {
          console.error('复制失败:', err);
        }
      );
    };
    
    return !inline && match ? (
      <div className="code-block-container">
        <div className="code-block-header">
          <span className="code-language">{language}</span>
          <div className="code-block-header-actions">
            <button 
              className="copy-code-button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                copyToClipboard(codeString);
              }}
              aria-label="复制代码"
            >
              复制代码
            </button>
          </div>
        </div>
        <SyntaxHighlighter
          style={vs}
          language={language}
          PreTag="div"
          className="code-block"
          showLineNumbers={true}
          wrapLines={true}
          {...props}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code className={`inline-code ${className || ''}`} {...props}>
        {children}
      </code>
    );
  };
  
  return (
    <div className={`message ${isUser ? 'user-message' : 'assistant-message'} ${isError ? 'error-message' : ''}`}>
      <div className="message-avatar">
        {isUser ? <FaUser /> : <FaRobot />}
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-author">{isUser ? '' : `${displayModelName} | ${displayConfigName}`}</span>
          <span className="message-time">
            {new Date(timestamp).toLocaleTimeString()}
            {!isUser && isShowingBranch && 
              <span className="branch-indicator" title="当前显示的是一个分支回复">
                <FaCodeBranch style={{ marginLeft: '5px', fontSize: '12px' }} />
              </span>
            }
          </span>
        </div>
        <div className="message-text">
          {isEditing ? (
            <textarea
              className="edit-textarea"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={Math.max(3, editedContent.split("\n").length)}
            />
          ) : (
            <ReactMarkdown
              components={{
                code: CodeBlock
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>
        {isUser && (
          <div className="message-actions">
            {!isEditing ? (
              <>
                {hasMultipleVersions && (
                  <div className="response-navigation">
                    <button 
                      className={`nav-button ${canGoPrev ? '' : 'disabled'}`}
                      onClick={handlePrevVersion}
                      disabled={!canGoPrev}
                      title="显示上一个版本"
                    >
                      <FaChevronLeft />
                    </button>
                    <span className="version-indicator" title="当前显示的版本/总版本数">
                      {versionIndex + 1}/{versionCount}
                    </span>
                    <button 
                      className={`nav-button ${canGoNext ? '' : 'disabled'}`}
                      onClick={handleNextVersion}
                      disabled={!canGoNext}
                      title="显示下一个版本"
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                )}
                <button 
                  className="edit-button"
                  onClick={handleEdit}
                  title="编辑消息并重新生成回复"
                >
                  <FaPen /> 修改
                </button>
              </>
            ) : (
              <div className="edit-actions">
                <button
                  className="confirm-edit-button"
                  onClick={handleSubmitEdit}
                  title="确认修改并重新生成回复"
                >
                  <FaCheck /> 发送
                </button>
                <button
                  className="cancel-edit-button"
                  onClick={handleCancelEdit}
                  title="取消修改"
                >
                  <FaTimes /> 取消
                </button>
              </div>
            )}
          </div>
        )}
        {!isUser && (
          <div className="message-actions">
            {hasMultipleVersions && (
              <div className="response-navigation">
                <button 
                  className={`nav-button ${canGoPrev ? '' : 'disabled'}`}
                  onClick={handlePrevVersion}
                  disabled={!canGoPrev}
                  title="切换到上一个回复版本"
                >
                  <FaChevronLeft />
                </button>
                <span className="version-indicator" title="当前显示的回复版本/总回复版本数">
                  {versionIndex + 1}/{versionCount}
                  {hasBranches && ` (${branches.length}个分支)`}
                </span>
                <button 
                  className={`nav-button ${canGoNext ? '' : 'disabled'}`}
                  onClick={handleNextVersion}
                  disabled={!canGoNext}
                  title="切换到下一个回复版本"
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
            <button 
              className="regenerate-button"
              onClick={handleRegenerate}
              title="使用当前选择的模型重新生成回复"
            >
              <FaRedoAlt /> 重新生成
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;