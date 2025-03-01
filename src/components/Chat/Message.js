import React from 'react';
import ReactMarkdown from 'react-markdown';
import { FaUser, FaRobot, FaRedoAlt } from 'react-icons/fa';
import { useChat } from '../../contexts/ChatContext';
import { useApp } from '../../contexts/AppContext';

const Message = ({ message, modelName, configName }) => {
  const { role, content, timestamp, isError } = message;
  const isUser = role === 'user';
  const { regenerateResponse } = useChat();
  const { currentSessionId } = useApp();
  
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