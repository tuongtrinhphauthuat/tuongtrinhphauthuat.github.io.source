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

export const rewriteWithAI = async (provider, apiKey, modelId, prompt) => {
  console.log(`[AI Workflow] Starting rewriteWithAI. Provider: ${provider}, Model: ${modelId}`);
  console.log(`[AI Workflow] Prompt:\n${prompt}`);
  if (!apiKey) throw new Error('API Key is missing');
  if (!modelId) throw new Error('Model ID is missing');

  if (provider === 'google') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        candidateCount: 1
      }
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
    const data = await response.json();
    console.log('[AI Workflow] Google AI Success Data:', JSON.stringify(data, null, 2));
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      console.log('[AI Workflow] Google AI Final Text Output:\n' + text);
      return text;
    } else {
      console.error('[AI Workflow] Google API unexpected data structure:', data);
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
