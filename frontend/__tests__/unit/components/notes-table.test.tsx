import { render, screen } from '@testing-library/react';
import { NotesTable } from '@/components/notes/notes-table';

describe('NotesTable', () => {
  it('should render empty state when no data', () => {
    render(<NotesTable data={[]} isLoading={false} />);
    expect(screen.getByText(/aucune note/i)).toBeInTheDocument();
  });

  it('should render grades correctly', () => {
    const grades = [{ id: '1', subject_name: 'Maths', marks_obtained: 18, marks_total: 20 }];
    render(<NotesTable data={grades} isLoading={false} />);
    expect(screen.getByText('Maths')).toBeInTheDocument();
    expect(screen.getByText('18/20')).toBeInTheDocument();
  });
});
