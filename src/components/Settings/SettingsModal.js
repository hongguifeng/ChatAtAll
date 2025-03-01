import React, { useState } from 'react';
import './SettingsModal.css';

const SettingsModal = ({ settings, onSave, onClose }) => {
  const [formValues, setFormValues] = useState({
    apiKey: settings.apiKey || '',
    proxyUrl: settings.proxyUrl || '',
    model: settings.model || 'gpt-3.5-turbo',
    customModel: settings.customModel || '',
  });
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value,
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const finalFormValues = {
      ...formValues,
      model: formValues.model === 'custom' ? formValues.customModel : formValues.model,
    };
    onSave(finalFormValues);
  };
  
  const models = [
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o-mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'custom', name: '自定义模型' },
  ];
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>设置</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="apiKey">OpenAI API Key</label>
            <input
              type="password"
              id="apiKey"
              name="apiKey"
              value={formValues.apiKey}
              onChange={handleChange}
              placeholder="sk-..."
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="proxyUrl">API代理URL（可选）</label>
            <input
              type="text"
              id="proxyUrl"
              name="proxyUrl"
              value={formValues.proxyUrl}
              onChange={handleChange}
              placeholder="https://your-proxy-url.com"
            />
            <small>
              不填写则直接使用OpenAI官方API。如需使用代理，请填写完整URL，例如：https://your-proxy-url.com
            </small>
          </div>
          
          <div className="form-group">
            <label htmlFor="model">模型</label>
            <select
              id="model"
              name="model"
              value={formValues.model}
              onChange={handleChange}
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            {formValues.model === 'custom' && (
              <input
                type="text"
                id="customModel"
                name="customModel"
                value={formValues.customModel}
                onChange={handleChange}
                placeholder="请输入自定义模型名称"
                className="mt-2"
              />
            )}
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              取消
            </button>
            <button type="submit" className="save-button">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;