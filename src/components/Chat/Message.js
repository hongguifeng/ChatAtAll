import React from 'react';
import ReactMarkdown from 'react-markdown';
import { FaUser, FaRobot, FaRedoAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useChat } from '../../contexts/ChatContext';
import { useApp } from '../../contexts/AppContext';

const Message = ({ message, modelName, configName }) => {
  const { role, content, timestamp, isError, versions, currentVersionIndex, totalVersions } = message;
  const isUser = role === 'user';
  const { regenerateResponse, switchResponseVersion } = useChat();
  const { currentSessionId } = useApp();
  
  // 计算导航信息
  const hasMultipleVersions = versions && versions.length > 1;
  const versionIndex = currentVersionIndex !== undefined ? currentVersionIndex : 0;
  const versionCount = totalVersions || (versions ? versions.length : 1);
  const canGoPrev = versionIndex > 0;
  const canGoNext = versionIndex < versionCount - 1;
  
  const handlePrevVersion = () => {
    if (canGoPrev) {
      switchResponseVersion(currentSessionId, versionIndex - 1);
    }
  };
  
  const handleNextVersion = () => {
    if (canGoNext) {
      switchResponseVersion(currentSessionId, versionIndex + 1);
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
                  title="上一个回复"
                >
                  <FaChevronLeft />
                </button>
                <span className="version-indicator">{versionIndex + 1}/{versionCount}</span>
                <button 
                  className={`nav-button ${canGoNext ? '' : 'disabled'}`}
                  onClick={handleNextVersion}
                  disabled={!canGoNext}
                  title="下一个回复"
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
            <button 
              className="regenerate-button"
              onClick={() => regenerateResponse(currentSessionId)}
              title="重新生成回复"
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