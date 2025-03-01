import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';

const SessionItem = ({ session, isActive }) => {
  const { setCurrentSessionId, deleteSession, renameSession } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(session.name);
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);
  
  const handleClick = () => {
    if (!isEditing) {
      setCurrentSessionId(session.id);
    }
  };
  
  const handleDelete = (e) => {
    e.stopPropagation();
    deleteSession(session.id);
  };
  
  const startEditing = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setNewName(session.name);
  };
  
  const cancelEditing = (e) => {
    e.stopPropagation();
    setIsEditing(false);
  };
  
  const saveNewName = (e) => {
    e.stopPropagation();
    if (newName.trim()) {
      renameSession(session.id, newName.trim());
    }
    setIsEditing(false);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveNewName(e);
    } else if (e.key === 'Escape') {
      cancelEditing(e);
    }
  };
  
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };
  
  return (
    <li
      className={`session-item ${isActive ? 'active' : ''}`}
      onClick={handleClick}
    >
      {isEditing ? (
        <div className="session-edit">
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="edit-actions">
            <button onClick={saveNewName} className="edit-button">
              <FaCheck />
            </button>
            <button onClick={cancelEditing} className="edit-button">
              <FaTimes />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="session-info">
            <span className="session-name">{session.name}</span>
            <span className="session-date">{formatDate(session.createdAt)}</span>
          </div>
          <div className="session-actions">
            <button onClick={startEditing} className="session-button">
              <FaEdit />
            </button>
            <button onClick={handleDelete} className="session-button">
              <FaTrash />
            </button>
          </div>
        </>
      )}
    </li>
  );
};

export default SessionItem;