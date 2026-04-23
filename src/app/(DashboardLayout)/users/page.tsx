'use client';

import React, { useEffect, useState } from 'react';
import CommonBreadcrumb from '@/components/shared/CommonBreadcrumb';
import CommonCardHeader from '@/components/shared/CommonCardHeader';
import RoleGuard from '@/components/auth/RoleGuard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

type Role = 'admin' | 'moderator' | 'editor' | 'member' | 'viewer' | 'guest';

interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
}

/**
 * User management page for administrators
 * Displays list of users and allows role changes
 */
const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newRole, setNewRole] = useState<Role | ''>('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          console.error('Invalid data format:', data);
          setUsers([]);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/users/${selectedUser._id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(users.map((user) => (user._id === updatedUser._id ? updatedUser : user)));
        setShowModal(false);
        setSelectedUser(null);
        setNewRole('');
      } else {
        console.error('Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    } finally {
      setUpdating(false);
    }
  };

  const openRoleModal = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowModal(true);
  };

  const getRoleBadgeVariant = (role: Role) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'moderator':
        return 'destructive';
      case 'editor':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <RoleGuard allowedRoles={['admin']}>
      <CommonBreadcrumb pageTitle='User Management' parent='Administration' />
      <div className='container mx-auto px-4'>
        <div className='grid grid-cols-1 gap-6'>
          <div className='col-span-1'>
            <div className='rounded-lg bg-card shadow'>
              <CommonCardHeader heading='Users' subHeading={[{ text: 'Manage user roles and permissions' }]} />
              <div className='p-6'>
                {loading ? (
                  <div className='flex justify-center p-4'>
                    <Loader2 className='h-8 w-8 animate-spin' />
                  </div>
                ) : users.length === 0 ? (
                  <div className='p-4 text-center text-muted-foreground'>No users found or error loading users. Please try again later.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user._id}>
                          <TableCell className='font-medium'>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant='ghost' size='sm' onClick={() => openRoleModal(user)}>
                              Change Role
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update role for <span className='font-medium'>{selectedUser?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='role'>Select role</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as Role)}>
                <SelectTrigger>
                  <SelectValue placeholder='Select a role' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='admin'>Admin</SelectItem>
                  <SelectItem value='moderator'>Moderator</SelectItem>
                  <SelectItem value='editor'>Editor</SelectItem>
                  <SelectItem value='member'>Member</SelectItem>
                  <SelectItem value='viewer'>Viewer</SelectItem>
                  <SelectItem value='guest'>Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setShowModal(false)} disabled={updating}>
              Cancel
            </Button>
            <Button onClick={handleRoleChange} disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Updating...
                </>
              ) : (
                'Update Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleGuard>
  );
};

export default UsersPage;
