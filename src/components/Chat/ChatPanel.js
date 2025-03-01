import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useChat } from '../../contexts/ChatContext';
import Message from './Message';
import InputArea from './InputArea';
import './ChatPanel.css';

const ChatPanel = ({ session }) => {
  const { updateSessionMessages } = useApp();
  const { isLoading, sendMessage } = useChat();
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = () => {
    if (!inputValue.trim() || !session) return;
    
    sendMessage(inputValue.trim(), session.messages, (updatedMessages) => {
      updateSessionMessages(session.id, updatedMessages);
    });
    
    setInputValue('');
  };

  if (!session) {
    return (
      <div className="chat-panel empty-state">
        <div className="empty-message">
          <h2>没有选择会话</h2>
          <p>请从侧边栏选择一个会话或创建新会话</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h2>{session.name}</h2>
      </div>
      
      <div className="messages-container">
        {session.messages.length === 0 ? (
          <div className="welcome-message">
            <h2>欢迎使用ChatGPT客户端</h2>
            <p>开始发送消息与AI助手交流吧</p>
          </div>
        ) : (
          session.messages.map((message, index) => (
            <Message key={index} message={message} />
          ))
        )}
      </div>
      
      <InputArea
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ChatPanel;