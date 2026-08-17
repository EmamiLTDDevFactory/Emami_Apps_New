import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/**
 * Maps the hub's own screens to real browser URLs (web) / deep links
 * (native), so the address bar reflects navigation — e.g. opening the
 * Non CTC Expense launch screen shows `/apps/expense`. This is independent
 * of each embedded app's own real URL, which the WebView/iframe loads
 * directly; see src/data/mockData.ts for why that's a direct URL, not proxied.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['emamihub://'],
  config: {
    screens: {
      Login: 'login',
      Main: {
        screens: {
          Home: '',
          MyApplications: 'my-applications',
          Favorites: 'favorites',
          Recent: 'recent',
          AllApplications: 'all-applications',
          Help: 'help',
          Settings: 'settings',
        },
      },
      AppDetail: 'apps/:appId',
    },
  },
};
