import { renderWithProviders } from './__tests__/helpers/testUtils';
import App from './App';

test('renders app without crashing', () => {
  // Use renderWithProviders which includes Router and ThemeProvider
  const { container } = renderWithProviders(<App />);
  // Just verify the app renders without crashing
  expect(container).toBeInTheDocument();
});
