import axios from 'axios';

// 常规的非流式API调用
export async function fetchChatCompletion(apiKey, proxyUrl, model, messages) {
  const baseUrl = proxyUrl || 'https://api.openai.com';
  const endpoint = `${baseUrl}/v1/chat/completions`;

  try {
    const response = await axios.post(
      endpoint,
      {
        model: model,
        messages: messages,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API 调用失败:', error);
    throw new Error(
      error.response 
        ? `API错误: ${error.response.status} - ${error.response.data.error.message}` 
        : '网络错误，无法连接到API'
    );
  }
}

// 流式API调用
export async function fetchStreamingChatCompletion(apiKey, proxyUrl, model, messages, onChunk) {
  const baseUrl = proxyUrl || 'https://api.openai.com';
  const endpoint = `${baseUrl}/v1/chat/completions`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `API错误: ${response.status} - ${error.error?.message || '未知错误'}`
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split('\n');
      buffer = lines.pop(); // 保留最后一个可能不完整的行

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const json = JSON.parse(data);
            const content = json.choices[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              onChunk(content, fullContent);
            }
          } catch (e) {
            console.error('解析流数据失败:', e);
          }
        }
      }
    }

    return fullContent;
  } catch (error) {
    console.error('OpenAI API 调用失败:', error);
    throw new Error(
      error.response
        ? `API错误: ${error.response.status} - ${error.response.data?.error?.message}`
        : '网络错误，无法连接到API'
    );
  }
}