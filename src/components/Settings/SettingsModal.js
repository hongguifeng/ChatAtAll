import React, { useState } from 'react';
import './SettingsModal.css';

const SettingsModal = ({ settings, onSave, onClose }) => {
  const [formValues, setFormValues] = useState({
    apiKey: settings.apiKey || '',
    proxyUrl: settings.proxyUrl || '',
    model: settings.model || 'gpt-3.5-turbo',
    customModels: settings.customModels || [],
    newCustomModel: ''
  });
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value,
    });
  };

  const handleAddCustomModel = () => {
    if (formValues.newCustomModel.trim()) {
      setFormValues({
        ...formValues,
        customModels: [...formValues.customModels, formValues.newCustomModel.trim()],
        newCustomModel: ''
      });
    }
  };

  const handleRemoveCustomModel = (modelToRemove) => {
    setFormValues({
      ...formValues,
      customModels: formValues.customModels.filter(model => model !== modelToRemove),
      model: formValues.model === modelToRemove ? 'gpt-3.5-turbo' : formValues.model
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formValues);
  };
  
  const defaultModels = [
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o-mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
  ];

  const allModels = [
    ...defaultModels,
    ...formValues.customModels.map(model => ({ id: model, name: model }))
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
              {allModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>自定义模型管理</label>
            <div className="custom-model-input">
              <input
                type="text"
                name="newCustomModel"
                value={formValues.newCustomModel}
                onChange={handleChange}
                placeholder="输入自定义模型名称"
              />
              <button
                type="button"
                onClick={handleAddCustomModel}
                className="add-model-button"
              >
                添加
              </button>
            </div>
            {formValues.customModels.length > 0 && (
              <div className="custom-models-list">
                {formValues.customModels.map((model) => (
                  <div key={model} className="custom-model-item">
                    <span>{model}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomModel(model)}
                      className="remove-model-button"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
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