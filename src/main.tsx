import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { toast } from 'react-hot-toast';
import App from './App';
import { showSuccessToast } from './lib/utils/appToast';
import './index.css';

const updateToastId = 'app-update-available';

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    toast.custom(
      (toastState) => (
        <div
          className={`app-toast app-toast--info ${toastState.visible ? 'app-toast--enter' : 'app-toast--leave'}`}
        >
          <span className="app-toast-copy" style={{ gridColumn: '1 / span 2' }}>
            <span className="app-toast-title">Update available</span>
            <span className="app-toast-description">
              A newer version is ready. Reload to apply the update.
            </span>
            <span className="inline-actions" style={{ marginTop: '0.65rem' }}>
              <button
                className="secondary-button"
                onClick={() => toast.dismiss(toastState.id)}
                type="button"
              >
                Later
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  toast.dismiss(toastState.id);
                  void updateServiceWorker(true);
                }}
                type="button"
              >
                Update
              </button>
            </span>
          </span>
        </div>
      ),
      {
        duration: Infinity,
        id: updateToastId,
      },
    );
  },
  onOfflineReady() {
    showSuccessToast('Offline ready', 'The app can now run without a network connection.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
