import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuizList from '../../src/components/QuizList';

describe('QuizList', () => {
  const mockQuizzes = [
    {
      id: 1,
      title: 'История',
      category: 'Наука',
      question_count: 5,
      question_time: 20,
    },
    {
      id: 2,
      title: 'География',
      category: 'Наука',
      question_count: 0,
      question_time: 15,
    },
  ];

  const mockOnEdit = vi.fn();
  const mockOnStart = vi.fn();
  const mockOnResults = vi.fn();

  it('должен отображать список квизов', () => {
    render(
      <QuizList 
        quizzes={mockQuizzes} 
        onEdit={mockOnEdit}
        onStart={mockOnStart}
        onResults={mockOnResults}
      />
    );

    expect(screen.getByText('История')).toBeInTheDocument();
    expect(screen.getByText('География')).toBeInTheDocument();
    expect(screen.getByText('5 вопросов')).toBeInTheDocument();
    expect(screen.getByText('0 вопросов')).toBeInTheDocument();
  });

  it('должен показывать пустое состояние если нет квизов', () => {
    render(
      <QuizList 
        quizzes={[]} 
        onEdit={mockOnEdit}
        onStart={mockOnStart}
        onResults={mockOnResults}
      />
    );

    expect(screen.getByText('У вас пока нет квизов')).toBeInTheDocument();
  });

  it('кнопка "Запустить" должна быть disabled если нет вопросов', () => {
    render(
      <QuizList 
        quizzes={mockQuizzes} 
        onEdit={mockOnEdit}
        onStart={mockOnStart}
        onResults={mockOnResults}
      />
    );

    const buttons = screen.getAllByText('🚀 Запустить');
    expect(buttons[0]).not.toBeDisabled();
    expect(buttons[1]).toBeDisabled();
  });

  it('onEdit должен вызываться при клике на "Редактировать"', async () => {
    const user = userEvent.setup();
    
    render(
      <QuizList 
        quizzes={mockQuizzes} 
        onEdit={mockOnEdit}
        onStart={mockOnStart}
        onResults={mockOnResults}
      />
    );

    const editButtons = screen.getAllByText('Редактировать');
    await user.click(editButtons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith(mockQuizzes[0]);
  });

  it('onStart должен вызываться при клике на "Запустить"', async () => {
    const user = userEvent.setup();
    
    render(
      <QuizList 
        quizzes={mockQuizzes} 
        onEdit={mockOnEdit}
        onStart={mockOnStart}
        onResults={mockOnResults}
      />
    );

    const startButtons = screen.getAllByText('🚀 Запустить');
    await user.click(startButtons[0]);

    expect(mockOnStart).toHaveBeenCalledWith(mockQuizzes[0]);
  });

  it('onResults должен вызываться при клике на "Результаты"', async () => {
    const user = userEvent.setup();
    
    render(
      <QuizList 
        quizzes={mockQuizzes} 
        onEdit={mockOnEdit}
        onStart={mockOnStart}
        onResults={mockOnResults}
      />
    );

    const resultsButtons = screen.getAllByText('📊 Результаты');
    await user.click(resultsButtons[0]);

    expect(mockOnResults).toHaveBeenCalledWith(mockQuizzes[0]);
  });
});