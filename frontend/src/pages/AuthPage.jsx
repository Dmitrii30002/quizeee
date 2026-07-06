import { useState } from 'react';

export default function AuthPage({ onAuth, setMessage }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!onAuth) {
        console.error('onAuth is not defined');
        return;
      }
      
      if (isRegister) {
        await onAuth({
          username: formData.username,
          password: formData.password,
        }, 'register');
      } else {
        await onAuth({
          username: formData.username,
          password: formData.password,
        }, 'login');
      }
      setFormData({ username: '', password: '' });
    } catch (err) {
      if (setMessage) {
        setMessage(`✗ ${err.message}`);
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isRegister ? 'Регистрация' : 'Вход'}</h2>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            placeholder="Имя пользователя"
            value={formData.username}
            onChange={handleChange}
            required
          />
          
          <input
            type="password"
            name="password"
            placeholder="Пароль"
            value={formData.password}
            onChange={handleChange}
            required
          />
          
          <button type="submit" className="btn-primary">
            {isRegister ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </form>

        <p className="auth-toggle">
          {isRegister ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="btn-link"
          >
            {isRegister ? 'Войти' : 'Регистрация'}
          </button>
        </p>
      </div>
    </div>
  );
} 