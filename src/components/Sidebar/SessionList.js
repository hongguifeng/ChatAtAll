import React from 'react';
import { useApp } from '../../contexts/AppContext';
import SessionItem from './SessionItem';

const SessionList = ({ sessions }) => {
  const { currentSessionId } = useApp();
  
  return (
    <div className="session-list">
      <h2 className="session-list-header">会话列表</h2>
      {sessions.length === 0 ? (
        <div className="empty-sessions">没有会话</div>
      ) : (
        <ul className="sessions">
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === currentSessionId}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default SessionList;