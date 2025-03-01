import axios from 'axios';

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