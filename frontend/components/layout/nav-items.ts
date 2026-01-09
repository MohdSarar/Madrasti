import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  BookText,
  CalendarDays,
  ClipboardCheck,
  Mail,
  FileText,
  Settings
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Accueil', href: '/', icon: LayoutDashboard },
  { label: 'Notes', href: '/notes', icon: BookText },
  { label: 'Vie scolaire', href: '/vie-scolaire/absences', icon: ClipboardCheck },
  { label: 'Emploi du temps', href: '/emploi-du-temps', icon: CalendarDays },
  { label: 'Messagerie', href: '/messagerie', icon: Mail },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Paramètres', href: '/settings', icon: Settings }
];
