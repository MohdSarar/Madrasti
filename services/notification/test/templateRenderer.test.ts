import { renderTemplate } from '../src/services/templateRenderer';

describe('templateRenderer', () => {
  it('should render templates correctly', () => {
    const result = renderTemplate(
      { subject_template: 'Hello {{name}}', body_template: 'Welcome {{name}}' },
      { name: 'John' }
    );
    expect(result.subject).toBe('Hello John');
    expect(result.body).toBe('Welcome John');
  });
});
