import { SlashCommand } from '@/types';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export interface CommandResult {
  handled: boolean;
  navigateTo?: string;
  inlineComponent?: 'pricing' | 'help' | 'scan';
  systemMessage?: string;
}

const COMMANDS: Record<string, CommandResult> = {
  '/help': {
    handled: true,
    inlineComponent: 'help',
    systemMessage: '🛡️ **CyberDaddy Help** — Here are all available commands:',
  },
  '/pay': {
    handled: true,
    inlineComponent: 'pricing',
    systemMessage: '💳 **Subscription Plans** — Choose the plan that fits your needs:',
  },
  '/dashboard': {
    handled: true,
    navigateTo: '/dashboard',
    systemMessage: '📊 Opening your **Cybersecurity Dashboard**...',
  },
  '/profile': {
    handled: true,
    navigateTo: '/profile',
    systemMessage: '👤 Opening your **Profile**...',
  },
  '/family': {
    handled: true,
    navigateTo: '/family',
    systemMessage: '👨‍👩‍👧‍👦 Opening your **Family Circle**...',
  },
  '/scan': {
    handled: true,
    inlineComponent: 'scan',
    systemMessage: '🔍 **Screenshot Scanner** — Upload an image to analyze for threats:',
  },
  '/history': {
    handled: true,
    navigateTo: '/history',
    systemMessage: '📜 Opening your **Scan History**...',
  },
  '/settings': {
    handled: true,
    navigateTo: '/settings',
    systemMessage: '⚙️ Opening **Settings**...',
  },
};

export function parseCommand(input: string): SlashCommand | null {
  const trimmed = input.trim().toLowerCase();
  const cmd = Object.keys(COMMANDS).find((c) => trimmed === c || trimmed.startsWith(c + ' '));
  return cmd ? (cmd as SlashCommand) : null;
}

export function routeCommand(
  input: string,
  router: AppRouterInstance
): CommandResult {
  const trimmed = input.trim().toLowerCase();
  const cmd = Object.keys(COMMANDS).find((c) => trimmed === c || trimmed.startsWith(c + ' '));

  if (!cmd) return { handled: false };

  const result = COMMANDS[cmd];
  if (result.navigateTo) {
    setTimeout(() => router.push(result.navigateTo!), 800);
  }
  return result;
}

export const HELP_COMMANDS = [
  { command: '/help', description: 'Show this help message' },
  { command: '/pay', description: 'View subscription plans (Free, Pro, Family, Enterprise)' },
  { command: '/dashboard', description: 'Open your cybersecurity dashboard' },
  { command: '/profile', description: 'View and edit your profile' },
  { command: '/family', description: 'Manage your family protection circle' },
  { command: '/scan', description: 'Upload a screenshot for AI threat analysis' },
  { command: '/history', description: 'Browse your previous scan results' },
  { command: '/settings', description: 'Configure your CyberDaddy settings' },
];
