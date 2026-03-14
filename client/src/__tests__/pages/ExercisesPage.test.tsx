import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../test/helpers';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExercisesPage } from '../../pages/ExercisesPage';
import { api } from '../../api/client';

const mockApi = vi.mocked(api);

describe('ExercisesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getExercises.mockResolvedValue([]);
    mockApi.getTaxonomy.mockResolvedValue([]);
  });

  it('renders without crashing', () => {
    render(<ExercisesPage />);
    expect(screen.getByText('Exercise Library')).toBeInTheDocument();
  });

  it('shows Add Exercise and Generate buttons', () => {
    render(<ExercisesPage />);
    expect(screen.getByText('Add Exercise')).toBeInTheDocument();
    expect(screen.getByText('Generate')).toBeInTheDocument();
  });

  it('shows search input', () => {
    render(<ExercisesPage />);
    expect(screen.getByPlaceholderText('Search exercises...')).toBeInTheDocument();
  });

  it('shows empty state when no exercises', async () => {
    render(<ExercisesPage />);
    await waitFor(() => {
      expect(screen.getByText(/No exercises found/)).toBeInTheDocument();
    });
  });

  it('opens create form when Add Exercise clicked', async () => {
    const user = userEvent.setup();
    render(<ExercisesPage />);
    await user.click(screen.getByText('Add Exercise'));
    expect(screen.getByText('New Exercise')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
  });

  it('closes create form on cancel', async () => {
    const user = userEvent.setup();
    render(<ExercisesPage />);
    await user.click(screen.getByText('Add Exercise'));
    expect(screen.getByText('New Exercise')).toBeInTheDocument();
    await user.click(screen.getByText('Cancel'));
    expect(screen.queryByText('New Exercise')).not.toBeInTheDocument();
  });

  it('displays exercises from API', async () => {
    mockApi.getExercises.mockResolvedValue([
      {
        id: '1', title: 'Taffanel No.4', source: '17 Grands Exercices', source_type: 'book',
        category_id: null, key: 'C major', difficulty: 5, description: 'Daily exercise',
        tags: ['warm-up'], times_used: 3, last_used: null, notation_data: null,
        notation_format: '', secondary_categories: [], created_at: '', updated_at: '',
      },
    ] as any);
    render(<ExercisesPage />);
    await waitFor(() => {
      expect(screen.getByText('Taffanel No.4')).toBeInTheDocument();
      expect(screen.getByText('17 Grands Exercices')).toBeInTheDocument();
      expect(screen.getByText('C major')).toBeInTheDocument();
    });
  });

  it('shows tags on exercises', async () => {
    mockApi.getExercises.mockResolvedValue([
      {
        id: '1', title: 'Scale', source: '', source_type: 'manual',
        category_id: null, key: null, difficulty: null, description: '',
        tags: ['daily', 'scales'], times_used: 0, last_used: null, notation_data: null,
        notation_format: '', secondary_categories: [], created_at: '', updated_at: '',
      },
    ] as any);
    render(<ExercisesPage />);
    await waitFor(() => {
      expect(screen.getByText('daily')).toBeInTheDocument();
      expect(screen.getByText('scales')).toBeInTheDocument();
    });
  });

  it('Create button disabled when title empty', async () => {
    const user = userEvent.setup();
    render(<ExercisesPage />);
    await user.click(screen.getByText('Add Exercise'));
    const createBtn = screen.getByText('Create').closest('button');
    expect(createBtn).toBeDisabled();
  });

  it('creates exercise when form submitted', async () => {
    const user = userEvent.setup();
    mockApi.createExercise.mockResolvedValue({});
    render(<ExercisesPage />);
    await user.click(screen.getByText('Add Exercise'));
    await user.type(screen.getByLabelText('Title'), 'My Exercise');
    const createBtn = screen.getByText('Create').closest('button')!;
    await user.click(createBtn);
    expect(mockApi.createExercise).toHaveBeenCalled();
  });

  it('shows filter dropdowns', () => {
    render(<ExercisesPage />);
    expect(screen.getByText('All categories')).toBeInTheDocument();
    expect(screen.getByText('All sources')).toBeInTheDocument();
  });
});
