import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { ChartPieIcon } from '@phosphor-icons/react/dist/ssr/ChartPie';
import { FileTextIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import { GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { PlugsConnectedIcon } from '@phosphor-icons/react/dist/ssr/PlugsConnected';
import { ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';
import { InvoiceIcon } from '@phosphor-icons/react/dist/ssr/Invoice';
import { UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
import { XSquare } from '@phosphor-icons/react/dist/ssr/XSquare';

export const navIcons = {
  'chart-pie': ChartPieIcon,
  'file-text': FileTextIcon,
  'gear-six': GearSixIcon,
  'plugs-connected': PlugsConnectedIcon,
  'receipt': ReceiptIcon,
  'file-invoice': InvoiceIcon,
  'x-square': XSquare,
  user: UserIcon,
  users: UsersIcon,
} as Record<string, Icon>;
