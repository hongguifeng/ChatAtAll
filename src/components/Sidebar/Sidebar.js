import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { useSettings } from '../../contexts/SettingsContext';
import SessionList from './SessionList';
import { FaPlus, FaCog } from 'react-icons/fa';
import SettingsModal from '../Settings/SettingsModal'
import './Sidebar.css';

const Sidebar = () => {
  const { sessions, handleNewSession } = useApp();
  const { settings, saveSettings } = useSettings();
  const [showSettings, setShowSettings] = React.useState(false);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>ChatAtAll</h1>
        <div className="sidebar-actions">
          <button onClick={handleNewSession} className="action-button">
            <FaPlus />
          </button>
          <button onClick={() => setShowSettings(true)} className="action-button">
            <FaCog />
          </button>
        </div>
      </div>
      
      <SessionList sessions={sessions} />
      
      {showSettings && (
        <SettingsModal 
          settings={settings} 
          onSave={saveSettings} 
          onClose={() => setShowSettings(false)} 
        />
      )}
    </div>
  );
};

export default Sidebar;