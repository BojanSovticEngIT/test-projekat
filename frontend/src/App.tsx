import AppRouter from './router/AppRouter';
import { ToastProvider } from './lib/ToastProvider';

function App(): JSX.Element {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  );
}

export default App;
