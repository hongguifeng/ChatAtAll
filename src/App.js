import React, { useEffect, useState } from 'react';
import { SettingsProvider } from './contexts/SettingsContext';
import { ChatProvider } from './contexts/ChatContext';
import { AppProvider } from './contexts/AppContext';
import Sidebar from './components/Sidebar/Sidebar';
import ChatPanel from './components/Chat/ChatPanel';
import SettingsModal from './components/Settings/SettingsModal';
import './index.css';

const { ipcRenderer } = window.require('electron');

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    apiKey: '',
    proxyUrl: '',
    model: 'gpt-3.5-turbo',
    customModels: []
  });
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // 初始化设置
  useEffect(() => {
    const savedSettings = ipcRenderer.sendSync('get-settings');
    if (savedSettings) {
      setSettings(savedSettings);
    }

    const savedSessions = ipcRenderer.sendSync('get-sessions');
    if (savedSessions && savedSessions.length > 0) {
      setSessions(savedSessions);
      setCurrentSessionId(savedSessions[0].id);
    } else {
      // 创建默认会话
      const defaultSession = {
        id: 'default-session',
        name: '新会话',
        messages: [],
        createdAt: Date.now(),
      };
      setSessions([defaultSession]);
      setCurrentSessionId(defaultSession.id);
      ipcRenderer.sendSync('save-sessions', [defaultSession]);
    }

    // 监听新会话事件
    ipcRenderer.on('new-session', handleNewSession);
    
    // 监听打开设置事件
    ipcRenderer.on('open-settings', () => setShowSettings(true));

    return () => {
      ipcRenderer.removeListener('new-session', handleNewSession);
      ipcRenderer.removeListener('open-settings', () => setShowSettings(true));
    };
  }, []);

  // 创建新会话
  const handleNewSession = () => {
    const newSession = {
      id: `session-${Date.now()}`,
      name: '新会话',
      messages: [],
      createdAt: Date.now(),
    };
    
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setCurrentSessionId(newSession.id);
    ipcRenderer.sendSync('save-sessions', updatedSessions);
  };

  // 保存设置
  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    ipcRenderer.sendSync('save-settings', newSettings);
    setShowSettings(false);
  };

  // 更新会话
  const updateSessions = (updatedSessions) => {
    setSessions(updatedSessions);
    ipcRenderer.sendSync('save-sessions', updatedSessions);
  };

  // 更新当前会话的消息
  const updateSessionMessages = (sessionId, messages, configIndex, modelName) => {
    const updatedSessions = sessions.map(session => {
      if (session.id === sessionId) {
        return { 
          ...session, 
          messages,
          configIndex: configIndex !== undefined ? configIndex : session.configIndex,
          modelName: modelName !== undefined ? modelName : session.modelName
        };
      }
      return session;
    });
    
    updateSessions(updatedSessions);
  };

  // 删除会话
  const deleteSession = (sessionId) => {
    const updatedSessions = sessions.filter(session => session.id !== sessionId);
    
    updateSessions(updatedSessions);
    
    // 如果删除的是当前会话，则切换到第一个会话
    if (sessionId === currentSessionId && updatedSessions.length > 0) {
      setCurrentSessionId(updatedSessions[0].id);
    } else if (updatedSessions.length === 0) {
      // 如果没有会话了，创建一个新的
      handleNewSession();
    }
  };

  // 重命名会话
  const renameSession = (sessionId, newName) => {
    const updatedSessions = sessions.map(session => {
      if (session.id === sessionId) {
        return { ...session, name: newName };
      }
      return session;
    });
    
    updateSessions(updatedSessions);
  };

  // 获取当前会话
  const getCurrentSession = () => {
    return sessions.find(session => session.id === currentSessionId) || null;
  };

  return (
    <AppProvider 
      value={{
        sessions,
        currentSessionId,
        setCurrentSessionId,
        handleNewSession,
        deleteSession,
        renameSession,
        updateSessionMessages,
      }}
    >
      <SettingsProvider value={{ settings, saveSettings }}>
        <ChatProvider>
          <div className="app-container">
            <Sidebar />
            <ChatPanel session={getCurrentSession()} />
            {showSettings && (
              <SettingsModal 
                settings={settings} 
                onSave={saveSettings} 
                onClose={() => setShowSettings(false)} 
              />
            )}
          </div>
        </ChatProvider>
      </SettingsProvider>
    </AppProvider>
  );
}

export default App;