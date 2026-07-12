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

export const rewriteWithAI = async (provider, apiKey, prompt) => {
  if (!apiKey) throw new Error('API Key is missing');

  if (provider === 'google') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Google API Error');
    }
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } else if (provider === 'openrouter') {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5', // Default model, can be made configurable
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'OpenRouter API Error');
    }
    const data = await response.json();
    return data.choices[0].message.content;
  } else {
    throw new Error('Unsupported AI Provider');
  }
}
