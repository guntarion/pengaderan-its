// src/app/(DashboardLayout)/layout/vertical/sidebar/Sidebaritems.ts
import { uniqueId } from 'lodash';

export interface ChildItem {
  id?: number | string;
  name?: string;
  icon?: string;
  children?: ChildItem[];
  url?: string;
  color?: string;
  isPro?: boolean;
  roles?: string[]; // Add roles property
}

export interface MenuItem {
  heading?: string;
  name?: string;
  icon?: string;
  id?: number;
  to?: string;
  items?: MenuItem[];
  children?: ChildItem[];
  url?: string;
  isPro?: boolean;
  roles?: string[]; // Add roles property
}

/**
 * Sidebar menu items with role-based access control
 * Each item can specify which roles can access it
 */
const SidebarContent: MenuItem[] = [
  {
    isPro: true,
    heading: 'Dashboards',
    children: [
      {
        name: 'Dashboard',
        icon: 'solar:widget-add-line-duotone',
        id: uniqueId(),
        url: '/',
        isPro: false,
        roles: ['guest', 'member', 'moderator', 'editor', 'viewer', 'admin'], // All roles can see dashboard
      },

      {
        name: 'AI Pages',
        id: uniqueId(),
        isPro: false,
        roles: ['admin'], // Only admin can see this section
        icon: 'solar:home-angle-linear',
        children: [
          {
            name: 'Sample Page',
            id: uniqueId(),
            url: '/sample-page',
            isPro: false,
          },
          {
            name: 'Qwen AI',
            id: uniqueId(),
            url: '/ai-page/qwen-ai',
            isPro: false,
          },

          {
            name: 'Anthropic AI',
            id: uniqueId(),
            url: '/ai-page/anthropic-ai',
            isPro: false,
          },
          {
            name: 'Ollama',
            id: uniqueId(),
            url: '/ai-page/ollama',
            isPro: false,
          },
          {
            name: 'DeepSeek',
            id: uniqueId(),
            url: '/ai-page/deepseekai',
            isPro: false,
          },
          {
            name: 'DeepSeek Reasoning',
            id: uniqueId(),
            url: '/ai-page/deepseekReasoning',
            isPro: false,
          },
          {
            name: 'Gemini',
            id: uniqueId(),
            url: '/ai-page/geminiai',
            isPro: false,
          },
          {
            name: 'Perplexity',
            id: uniqueId(),
            url: '/ai-page/perplexityai',
            isPro: false,
          },
          {
            name: 'Perplexity Sonar',
            id: uniqueId(),
            url: '/ai-page/sonarperplexity',
            isPro: false,
          },
        ],
      },
    ],
  },
  {
    isPro: false,
    heading: 'Mockup',
    children: [
      {
        name: 'Proto Page',
        id: uniqueId(),
        isPro: false,
        icon: 'solar:battery-full-minimalistic-line-duotone',
        roles: ['member', 'moderator', 'editor', 'admin'], // Only these roles can see this
        children: [
          {
            id: uniqueId(),
            name: 'Image Upload',
            url: '/mockup/image-upload',
            isPro: false,
            roles: ['member', 'moderator', 'editor', 'admin'],
          },
          {
            id: uniqueId(),
            name: 'File Upload',
            url: '/mockup/file-upload',
            isPro: false,
            roles: ['moderator', 'editor', 'admin'],
          },
          {
            id: uniqueId(),
            name: 'Send Email',
            url: '/mockup/send-email',
            isPro: false,
            roles: ['moderator', 'editor', 'admin'],
          },
        ],
      },
    ],
  },
  {
    heading: '',
    isPro: false,
    roles: ['admin'], // Only admin can see this section
    children: [
      {
        name: 'User Management',
        icon: 'solar:users-group-rounded-outline',
        id: uniqueId(),
        url: '/users',
        isPro: false,
        roles: ['admin'],
      },
      {
        name: 'Sample Page',
        icon: 'solar:notes-minimalistic-outline',
        id: uniqueId(),
        url: '/sample-page',
        isPro: false,
        roles: ['admin', 'editor'],
      },
    ],
  },
];

export default SidebarContent;