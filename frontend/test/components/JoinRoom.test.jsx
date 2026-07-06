import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import JoinRoom from '../../src/components/JoinRoom';

vi.mock('../../src/api', () => ({
  loadSession: vi.fn(() => ({ token: 'test-token', user: { id: 1 } })),
  request: vi.fn(() => Promise.resolve({ title: 'Test Quiz', questions: [] })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('JoinRoom', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    connected: false,
  };
  const mockSetMessage = vi.fn();
  const mockOnJoined = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderJoinRoom = () => {
    return render(
      <BrowserRouter>
        <JoinRoom 
          socket={mockSocket} 
          setMessage={mockSetMessage} 
          onJoined={mockOnJoined}
        />
      </BrowserRouter>
    );
  };

  it('должен рендерить форму ввода кода', () => {
    renderJoinRoom();

    expect(screen.getByPlaceholderText('Код комнаты (например: ABC123)')).toBeInTheDocument();
    expect(screen.getByText('Присоединиться')).toBeInTheDocument();
  });

  it('должен показывать ошибку при пустом коде', async () => {
    const user = userEvent.setup();
    renderJoinRoom();

    await user.click(screen.getByText('Присоединиться'));
    
    expect(mockSetMessage).toHaveBeenCalledWith('✗ Введите код комнаты');
  });

  it('должен отправлять join-room событие при вводе кода', async () => {
    const user = userEvent.setup();
    renderJoinRoom();

    const input = screen.getByPlaceholderText('Код комнаты (например: ABC123)');
    await user.type(input, 'ABC123');
    await user.click(screen.getByText('Присоединиться'));

    expect(mockSocket.connect).toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith('join-room', {
      roomCode: 'ABC123',
      token: 'test-token',
    });
  });

  it('должен преобразовывать код в верхний регистр', async () => {
    const user = userEvent.setup();
    renderJoinRoom();

    const input = screen.getByPlaceholderText('Код комнаты (например: ABC123)');
    await user.type(input, 'abc123');

    expect(input).toHaveValue('ABC123');
  });
});