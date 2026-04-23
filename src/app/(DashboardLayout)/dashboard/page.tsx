// src/app/(DashboardLayout)/dashboard/page.tsx
'use client';

import React from 'react';

import CommonBreadcrumb from '@/components/shared/CommonBreadcrumb';
import { useAuth } from '@/hooks/useAuth';

/**
 * Dashboard page for authenticated users
 * Shows personalized welcome message based on user role
 */
const Dashboard = () => {
  const { user } = useAuth();

  return (
    <>
      <CommonBreadcrumb pageTitle='Dashboard' parent='Home' />
      <div className='container mx-auto px-4'>
        <div className='grid grid-cols-1 gap-6'>
          <div className='col-span-1'>
            <div className='rounded-lg bg-white dark:bg-gray-800 shadow-md p-6'>
              <h2 className='text-2xl font-bold mb-4'>Welcome, {user?.name || 'User'}!</h2>
              <p className='text-gray-600 dark:text-gray-300 mb-6'>
                You are logged in as <span className='font-medium capitalize'>{user?.role || 'guest'}</span>.
              </p>

              {/* Admin-specific content */}
              {user?.role === 'admin' && (
                <div className='bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-6'>
                  <h3 className='text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2'>Admin Dashboard</h3>
                  <p className='text-blue-700 dark:text-blue-300'>
                    As an administrator, you have access to all features of the platform, including user management.
                  </p>
                </div>
              )}

              {/* Role-specific guidelines */}
              <div className='bg-gray-50 dark:bg-gray-700 p-4 rounded-lg'>
                <h3 className='text-lg font-semibold mb-2'>Your Access Level</h3>
                <p className='mb-2'>Based on your role, you have access to the following features:</p>
                <ul className='list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300'>
                  {user?.role === 'admin' && (
                    <>
                      <li>Full platform administration</li>
                      <li>User management</li>
                      <li>All innovation management features</li>
                    </>
                  )}
                  {user?.role === 'moderator' && (
                    <>
                      <li>Content moderation</li>
                      <li>Innovation review</li>
                      <li>User supervision</li>
                    </>
                  )}
                  {user?.role === 'editor' && (
                    <>
                      <li>Content creation and editing</li>
                      <li>Documentation management</li>
                    </>
                  )}
                  {user?.role === 'member' && (
                    <>
                      <li>Idea submission</li>
                      <li>Collaboration on projects</li>
                      <li>Basic innovation tools</li>
                    </>
                  )}
                  {user?.role === 'viewer' && (
                    <>
                      <li>View ideas and projects</li>
                      <li>Read documentation</li>
                    </>
                  )}
                  {(user?.role === 'guest' || !user?.role) && (
                    <>
                      <li>Limited platform access</li>
                      <li>Public content viewing</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
