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
    // The user requested using the Interactions API, replacing generateContent.
    // The Interactions API doesn't use the modelId in the URL path, it passes it in the body.
    const url = 'https://generativelanguage.googleapis.com/v1beta/interactions';

    // According to docs, the payload for the interactions API text generation:
    const requestBody = {
      model: modelId,
      input: prompt
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

    // Interactions API response structure:
    // data.output_text is not a direct property in the REST response, it usually returns an object with steps.
    // However, looking at the REST example:
    // data.steps[...].content[...].text where type="model_output" and content type="text"

    let finalOutput = '';

    if (data.steps && data.steps.length > 0) {
      for (const step of data.steps) {
        if (step.type === 'model_output' && step.content) {
           for (const content of step.content) {
             if (content.type === 'text') {
               finalOutput += content.text;
             }
           }
        }
      }
    } else if (data.output_text) {
      // Just in case the REST response includes it as a convenience wrapper
      finalOutput = data.output_text;
    }

    if (finalOutput) {
      console.log('[AI Workflow] Google AI Final Text Output:\n' + finalOutput);
      return finalOutput;
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
