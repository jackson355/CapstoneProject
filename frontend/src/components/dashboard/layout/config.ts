import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';

export const navItems = [
  { key: 'overview', title: 'Overview', href: paths.dashboard.overview, icon: 'chart-pie' },
  { key: 'clients', title: 'Client Management', href: paths.dashboard.clients, icon: 'users' },
  { key: 'users', title: 'User Management', href: paths.dashboard.users, icon: 'users' },
  { key: 'templates', title: 'Template Management', href: paths.dashboard.templates, icon: 'file-text' },
  { key: 'quotations', title: 'Quotation Management', href: paths.dashboard.quotations, icon: 'receipt' },
  { key: 'invoices', title: 'Invoice Management', href: paths.dashboard.invoices, icon: 'file-invoice' },
  { key: 'settings', title: 'Settings', href: paths.dashboard.settings, icon: 'gear-six' },
  { key: 'account', title: 'Account', href: paths.dashboard.account, icon: 'user' },
] satisfies NavItemConfig[];
