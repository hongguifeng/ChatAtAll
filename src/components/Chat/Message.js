import React from 'react';
import ReactMarkdown from 'react-markdown';
import { FaUser, FaRobot } from 'react-icons/fa';

const Message = ({ message, modelName, configName }) => {
  const { role, content, timestamp, isError } = message;
  const isUser = role === 'user';
  
  return (
    <div className={`message ${isUser ? 'user-message' : 'assistant-message'} ${isError ? 'error-message' : ''}`}>
      <div className="message-avatar">
        {isUser ? <FaUser /> : <FaRobot />}
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-author">{isUser ? '您' : `${modelName} | ${configName}`}</span>
          <span className="message-time">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
        <div className="message-text">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default Message;