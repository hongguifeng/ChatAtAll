import React from 'react';
import ReactMarkdown from 'react-markdown';
import { FaUser, FaRobot, FaRedoAlt, FaChevronLeft, FaChevronRight, FaCodeBranch } from 'react-icons/fa';
import { useChat } from '../../contexts/ChatContext';
import { useApp } from '../../contexts/AppContext';

const Message = ({ message, modelName, configName, index }) => {
  const { role, content, timestamp, isError, versions, currentVersionIndex, totalVersions, branches, currentBranchIndex } = message;
  const isUser = role === 'user';
  const { regenerateResponse, switchResponseVersion } = useChat();
  const { currentSessionId } = useApp();
  
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
  
  const handlePrevVersion = () => {
    if (canGoPrev) {
      switchResponseVersion(currentSessionId, versionIndex - 1, index);
    }
  };
  
  const handleNextVersion = () => {
    if (canGoNext) {
      switchResponseVersion(currentSessionId, versionIndex + 1, index);
    }
  };
  
  return (
    <div className={`message ${isUser ? 'user-message' : 'assistant-message'} ${isError ? 'error-message' : ''}`}>
      <div className="message-avatar">
        {isUser ? <FaUser /> : <FaRobot />}
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-author">{isUser ? '' : `${modelName} | ${configName}`}</span>
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
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
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
              onClick={() => regenerateResponse(currentSessionId, index)}
              title="重新生成回复（将创建新的对话分支）"
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