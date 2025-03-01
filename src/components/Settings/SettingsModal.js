import React, { useState } from 'react';
import './SettingsModal.css';

const SettingsModal = ({ settings, onSave, onClose }) => {
  const [formValues, setFormValues] = useState({
    apiConfigs: settings.apiConfigs || [
      {
        name: '默认配置',
        apiKey: settings.apiKey || '',
        proxyUrl: settings.proxyUrl || '',
        model: settings.model || 'gpt-3.5-turbo',
        customModels: settings.customModels || []
      }
    ],
    currentConfigIndex: 0,
    newCustomModel: '',
    editingConfigIndex: null
  });
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'newCustomModel') {
      setFormValues({
        ...formValues,
        newCustomModel: value
      });
    } else {
      const updatedConfigs = [...formValues.apiConfigs];
      updatedConfigs[formValues.currentConfigIndex] = {
        ...updatedConfigs[formValues.currentConfigIndex],
        [name]: value
      };
      setFormValues({
        ...formValues,
        apiConfigs: updatedConfigs
      });
    }
  };

  const handleAddCustomModel = () => {
    if (formValues.newCustomModel.trim()) {
      const updatedConfigs = [...formValues.apiConfigs];
      const currentConfig = updatedConfigs[formValues.currentConfigIndex];
      currentConfig.customModels = [...currentConfig.customModels, formValues.newCustomModel.trim()];
      
      setFormValues({
        ...formValues,
        apiConfigs: updatedConfigs,
        newCustomModel: ''
      });
    }
  };

  const handleRemoveCustomModel = (modelToRemove) => {
    const updatedConfigs = [...formValues.apiConfigs];
    const currentConfig = updatedConfigs[formValues.currentConfigIndex];
    currentConfig.customModels = currentConfig.customModels.filter(model => model !== modelToRemove);
    currentConfig.model = currentConfig.model === modelToRemove ? 'gpt-3.5-turbo' : currentConfig.model;
    
    setFormValues({
      ...formValues,
      apiConfigs: updatedConfigs
    });
  };

  const handleAddConfig = () => {
    setFormValues({
      ...formValues,
      apiConfigs: [
        ...formValues.apiConfigs,
        {
          name: `配置 ${formValues.apiConfigs.length + 1}`,
          apiKey: '',
          proxyUrl: '',
          model: 'gpt-3.5-turbo',
          customModels: []
        }
      ],
      currentConfigIndex: formValues.apiConfigs.length
    });
  };

  const handleRemoveConfig = (index) => {
    if (formValues.apiConfigs.length === 1) {
      return; // 保留至少一个配置
    }
    const updatedConfigs = formValues.apiConfigs.filter((_, i) => i !== index);
    setFormValues({
      ...formValues,
      apiConfigs: updatedConfigs,
      currentConfigIndex: Math.min(formValues.currentConfigIndex, updatedConfigs.length - 1)
    });
  };

  const handleConfigNameChange = (index, newName) => {
    const updatedConfigs = [...formValues.apiConfigs];
    updatedConfigs[index] = {
      ...updatedConfigs[index],
      name: newName
    };
    setFormValues({
      ...formValues,
      apiConfigs: updatedConfigs
    });
  };
  
  const startEditingConfigName = (index, e) => {
    e.stopPropagation();
    setFormValues({
      ...formValues,
      editingConfigIndex: index
    });
  };

  const stopEditingConfigName = () => {
    setFormValues({
      ...formValues,
      editingConfigIndex: null
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formValues.apiConfigs[0], // 保持向后兼容
      apiConfigs: formValues.apiConfigs
    });
  };
  
  const defaultModels = [
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o-mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
  ];

  const currentConfig = formValues.apiConfigs[formValues.currentConfigIndex];
  const allModels = [
    ...defaultModels,
    ...currentConfig.customModels.map(model => ({ id: model, name: model }))
  ];
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>设置</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="config-selector">
            <div className="config-tabs">
              {formValues.apiConfigs.map((config, index) => (
                <div 
                  key={index} 
                  className={`config-tab ${index === formValues.currentConfigIndex ? 'active' : ''}`}
                  onClick={() => setFormValues({ ...formValues, currentConfigIndex: index })}
                  onDoubleClick={(e) => startEditingConfigName(index, e)}
                >
                  {formValues.editingConfigIndex === index ? (
                    <input
                      type="text"
                      value={config.name}
                      onChange={(e) => handleConfigNameChange(index, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={stopEditingConfigName}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          stopEditingConfigName();
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <span>{config.name}</span>
                  )}
                  {formValues.apiConfigs.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveConfig(index);
                      }}
                      className="remove-config-button"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddConfig}
                className="add-config-button"
              >
                +
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="apiKey">OpenAI API Key</label>
            <input
              type="password"
              id="apiKey"
              name="apiKey"
              value={currentConfig.apiKey}
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
              value={currentConfig.proxyUrl}
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
              value={currentConfig.model}
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
            {currentConfig.customModels.length > 0 && (
              <div className="custom-models-list">
                {currentConfig.customModels.map((model) => (
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