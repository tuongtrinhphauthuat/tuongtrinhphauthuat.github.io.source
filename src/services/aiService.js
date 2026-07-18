// Basic encryption/obfuscation for local storage
const encrypt = (text) => {
  return btoa(text.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 42)).join(''));
}
const decrypt = (encoded) => {
  if (!encoded) return '';
  try {
    return atob(encoded).split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 42)).join('');
  } catch (e) {
    return '';
  }
}

export const getApiKeys = () => {
  return {
    google: decrypt(localStorage.getItem('ai_key_google')),
    openrouter: decrypt(localStorage.getItem('ai_key_openrouter')),
    provider: localStorage.getItem('ai_provider') || 'google'
  }
}

export const saveApiKeys = (google, openrouter, provider) => {
  if (google !== undefined) localStorage.setItem('ai_key_google', encrypt(google));
  if (openrouter !== undefined) localStorage.setItem('ai_key_openrouter', encrypt(openrouter));
  if (provider) localStorage.setItem('ai_provider', provider);
}

export const fetchModels = async (provider, apiKey) => {
  if (!apiKey) throw new Error('API Key is missing');

  if (provider === 'google') {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey
      }
    });
    if (!response.ok) {
      let err;
      try {
        err = await response.json();
        console.error('[AI Workflow] Google API Fetch Models Error Response:', err);
      } catch (parseError) {
        console.error('[AI Workflow] Google API Fetch Models Error Response could not be parsed as JSON. Status:', response.status);
      }
      throw new Error(err?.error?.message || 'Google API Error');
    }
    const data = await response.json();
    return data.models.filter(m => m.supportedGenerationMethods.includes('generateContent')).map(m => m.name.replace('models/', ''));
  } else if (provider === 'openrouter') {
    const url = 'https://openrouter.ai/api/v1/models';
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    if (!response.ok) {
      let err;
      try {
        err = await response.json();
        console.error('[AI Workflow] OpenRouter API Fetch Models Error Response:', err);
      } catch (parseError) {
        console.error('[AI Workflow] OpenRouter API Fetch Models Error Response could not be parsed as JSON. Status:', response.status);
      }
      throw new Error(err?.error?.message || 'OpenRouter API Error');
    }
    const data = await response.json();
    return data.data.map(m => m.id);
  }
  return [];
}

export const rewriteWithAI = async (provider, apiKey, modelId, prompt, onChunk) => {
  console.log(`[AI Workflow] Starting rewriteWithAI. Provider: ${provider}, Model: ${modelId}`);
  console.log(`[AI Workflow] Prompt:\n${prompt}`);
  if (!apiKey) throw new Error('API Key is missing');
  if (!modelId) throw new Error('Model ID is missing');

  if (provider === 'google') {
    // The user requested using the Interactions API, replacing generateContent.
    // The Interactions API doesn't use the modelId in the URL path, it passes it in the body.
    const url = 'https://generativelanguage.googleapis.com/v1beta/interactions?alt=sse';

    // According to docs, the payload for the interactions API text generation:
    const requestBody = {
      model: modelId,
      input: prompt,
      stream: true
    };

    console.log(`[AI Workflow] Google API Request URL: ${url}`);
    console.log(`[AI Workflow] Google API Request Body:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let err;
      try {
        err = await response.json();
        console.error('[AI Workflow] Google API Error Response:', err);
      } catch (parseError) {
        console.error('[AI Workflow] Google API Error Response could not be parsed as JSON. Status:', response.status);
      }
      throw new Error(err?.error?.message || 'Google API Error');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let finalOutput = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last partial line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          const dataStr = line.slice(6);
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.event_type === 'step.delta' && parsed.delta?.type === 'text') {
              const chunk = parsed.delta.text;
              finalOutput += chunk;
              if (onChunk) {
                onChunk(chunk);
              }
            } else if (parsed.event_type === 'error') {
               console.error('[AI Workflow] Google API Streaming Error:', parsed.error);
               throw new Error(parsed.error?.message || 'Google API Streaming Error');
            }
          } catch (e) {
            console.warn('[AI Workflow] Failed to parse SSE line:', line, e);
          }
        }
      }
    }

    if (finalOutput) {
      console.log('[AI Workflow] Google AI Final Text Output:\n' + finalOutput);
      return finalOutput;
    } else {
      console.error('[AI Workflow] Google API unexpected data structure or empty stream');
      throw new Error('Unexpected data structure from Google API (có thể do lỗi cấu trúc hoặc bị filter bởi safety).');
    }
  } else if (provider === 'openrouter') {
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const requestBody = {
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    };
    console.log(`[AI Workflow] OpenRouter API Request URL: ${url}`);
    console.log(`[AI Workflow] OpenRouter API Request Body:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      let err;
      try {
        err = await response.json();
        console.error('[AI Workflow] OpenRouter API Error Response:', err);
      } catch (parseError) {
        console.error('[AI Workflow] OpenRouter API Error Response could not be parsed as JSON. Status:', response.status);
      }
      throw new Error(err?.error?.message || 'OpenRouter API Error');
    }
    const data = await response.json();
    console.log('[AI Workflow] OpenRouter AI Success Data:', JSON.stringify(data, null, 2));
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      const text = data.choices[0].message.content;
      console.log('[AI Workflow] OpenRouter AI Final Text Output:\n' + text);
      return text;
    } else {
      console.error('[AI Workflow] OpenRouter API unexpected data structure:', data);
      throw new Error('Unexpected data structure from OpenRouter API');
    }
  } else {
    throw new Error('Unsupported AI Provider');
  }
}
