import type { LucideIcon } from 'lucide-react-native';

export type Category = 'Finance' | 'People' | 'Operations' | 'Sales' | 'Insights';

export interface AppItem {
  id: string;
  name: string;
  desc: string;
  cat: Category;
  icon: LucideIcon;
  uses: number;
  isNew?: boolean;
  /** AWS Amplify (or any) hosted web app URL. When set, AppDetailScreen embeds it in a WebView. */
  url?: string;
}

export interface RecentEntry {
  id: string;
  when: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  when: string;
  unread: boolean;
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export type SortOption = 'Alphabetical' | 'Most Used' | 'Recently Used';
export type CategoryFilter = 'All' | Category;

export interface UserAccessEntry {
  email: string;
  /** App ids (see AppItem) this user is granted access to. */
  appIds: string[];
}
