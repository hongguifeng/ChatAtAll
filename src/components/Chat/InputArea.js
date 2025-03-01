import React, { useRef, useEffect } from 'react';
import { FaPaperPlane } from 'react-icons/fa';

const InputArea = ({ value, onChange, onSend, isLoading }) => {
  const textareaRef = useRef(null);
  
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
        onClick={onSend}
        disabled={isLoading || !value.trim()}
        className="send-button"
      >
        <FaPaperPlane />
      </button>
    </div>
  );
};

export default InputArea;