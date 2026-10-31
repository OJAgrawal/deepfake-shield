import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['contextMenus', 'storage', 'notifications'],
    host_permissions: ['http://127.0.0.1:8001/*'],
    name: 'Proofy!',
    description: 'AI Deepfake and Misinformation Shield',
    action: {
      default_title: 'Proofy!',
    },
  }
});
