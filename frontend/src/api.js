const API_BASE = 'http://localhost:4000/api';

export async function request(path, options = {}) {
  const token = localStorage.getItem('quiz_token');
  const headers = { 
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers 
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  
  try {
    console.log(`[API] Request: ${options.method || 'GET'} ${path}`);
    
    const response = await fetch(`${API_BASE}${path}`, { 
      ...options, 
      headers 
    });
    
    if (!response.ok) {
      let errorMessage;
      try {
        const data = await response.json();
        errorMessage = data.error || `HTTP ${response.status}`;
      } catch (e) {
        const text = await response.text();
        console.error('[API] Non-JSON response:', text.substring(0, 200));
        errorMessage = `Сервер вернул ошибку ${response.status}`;
      }
      throw new Error(errorMessage);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[API] Non-JSON response:', text.substring(0, 200));
      throw new Error('Сервер вернул некорректный ответ');
    }
    
    const data = await response.json();
    console.log(`[API] Response:`, data);
    return data;
  } catch (err) {
    console.error('[API] Error:', err);
    throw err;
  }
}

export function saveSession(user, token) {
  localStorage.setItem('quiz_token', token);
  localStorage.setItem('quiz_user', JSON.stringify(user));
}

export function loadSession() {
  const token = localStorage.getItem('quiz_token');
  const user = localStorage.getItem('quiz_user');
  return token && user ? { token, user: JSON.parse(user) } : null;
}

export function clearSession() {
  localStorage.removeItem('quiz_token');
  localStorage.removeItem('quiz_user');
}