import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthPage from '../../src/pages/AuthPage';

describe('AuthPage', () => {
  const mockOnAuth = vi.fn();
  const mockSetMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('должен отображать форму входа по умолчанию', () => {
    render(<AuthPage onAuth={mockOnAuth} setMessage={mockSetMessage} />);

    expect(screen.getByText('Вход')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Имя пользователя')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Пароль')).toBeInTheDocument();
    expect(screen.getByText('Войти')).toBeInTheDocument();
    expect(screen.getByText('Нет аккаунта?')).toBeInTheDocument();
  });

  it('должен переключаться на регистрацию', async () => {
    const user = userEvent.setup();
    render(<AuthPage onAuth={mockOnAuth} setMessage={mockSetMessage} />);

    await user.click(screen.getByText('Регистрация'));

    expect(screen.getByText('Регистрация')).toBeInTheDocument();
    expect(screen.getByText('Зарегистрироваться')).toBeInTheDocument();
    expect(screen.getByText('Уже есть аккаунт?')).toBeInTheDocument();
  });

  it('onAuth должен вызываться с данными при входе', async () => {
    const user = userEvent.setup();
    render(<AuthPage onAuth={mockOnAuth} setMessage={mockSetMessage} />);

    await user.type(screen.getByPlaceholderText('Имя пользователя'), 'testuser');
    await user.type(screen.getByPlaceholderText('Пароль'), 'password123');
    await user.click(screen.getByText('Войти'));

    expect(mockOnAuth).toHaveBeenCalledWith(
      { username: 'testuser', password: 'password123' },
      'login'
    );
  });

  it('onAuth должен вызываться с данными при регистрации', async () => {
    const user = userEvent.setup();
    render(<AuthPage onAuth={mockOnAuth} setMessage={mockSetMessage} />);

    await user.click(screen.getByText('Регистрация'));
    await user.type(screen.getByPlaceholderText('Имя пользователя'), 'newuser');
    await user.type(screen.getByPlaceholderText('Пароль'), 'newpass123');
    await user.click(screen.getByText('Зарегистрироваться'));

    expect(mockOnAuth).toHaveBeenCalledWith(
      { username: 'newuser', password: 'newpass123' },
      'register'
    );
  });

  it('должен показывать ошибку если onAuth вернул ошибку', async () => {
    const user = userEvent.setup();
    mockOnAuth.mockRejectedValueOnce(new Error('Ошибка сервера'));
    
    render(<AuthPage onAuth={mockOnAuth} setMessage={mockSetMessage} />);

    await user.type(screen.getByPlaceholderText('Имя пользователя'), 'testuser');
    await user.type(screen.getByPlaceholderText('Пароль'), 'password123');
    await user.click(screen.getByText('Войти'));

    expect(mockSetMessage).toHaveBeenCalledWith('✗ Ошибка сервера');
  });
});