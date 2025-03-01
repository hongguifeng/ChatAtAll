import React, { useRef, useEffect } from 'react';
import { FaPaperPlane, FaStop } from 'react-icons/fa';
import { useChat } from '../../contexts/ChatContext';

const InputArea = ({ value, onChange, onSend, isLoading, isStreaming }) => {
  const textareaRef = useRef(null);
  const { stopGenerating } = useChat();
  
  // 自动调整文本区高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleButtonClick = () => {
    if (isStreaming) {
      // 如果正在流式生成，点击按钮停止生成
      stopGenerating();
    } else {
      // 如果不是流式生成，则发送消息
      onSend();
    }
  };

  return (
    <div className="input-area">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息..."
        disabled={isLoading}
        rows={1}
      />
      <button
        onClick={handleButtonClick}
        disabled={(isLoading && !isStreaming) || (!isStreaming && !value.trim())}
        className={`send-button ${isStreaming ? 'stop-button' : ''}`}
      >
        {isStreaming ? (
          <>
            <FaStop />
            <span className="loading-dots">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </span>
          </>
        ) : (
          <FaPaperPlane />
        )}
      </button>
    </div>
  );
};

export default InputArea;