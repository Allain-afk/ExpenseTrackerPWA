import { Toaster } from 'react-hot-toast';

export function AppToaster() {
  return (
    <Toaster
      gutter={14}
      position="top-center"
      reverseOrder={false}
      toastOptions={{
        duration: 4200,
      }}
    />
  );
}
