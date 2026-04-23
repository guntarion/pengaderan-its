'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Gender = 'lelaki' | 'perempuan';

type FormDataType = {
  name: string;
  namaPanggilan: string;
  nomerHandphone: string;
  gender: Gender | undefined;
  tanggalLahir: string | undefined;
  image?: string;
};

type SubmitFormDataType = Omit<FormDataType, 'tanggalLahir'> & { tanggalLahir?: Date | string };

/**
 * Profile page component
 * Allows users to view and edit their profile information
 */
const ProfilePage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<FormDataType>({
    name: '',
    namaPanggilan: '',
    nomerHandphone: '',
    gender: undefined,
    tanggalLahir: undefined,
  });

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        try {
          const response = await fetch(`/api/users/${user.id}`);
          if (response.ok) {
            const userData = await response.json();
            setFormData({
              name: userData.name || '',
              namaPanggilan: userData.namaPanggilan || '',
              nomerHandphone: userData.nomerHandphone || '',
              gender: userData.gender as Gender,
              tanggalLahir: userData.tanggalLahir ? new Date(userData.tanggalLahir).toISOString().split('T')[0] : undefined,
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };

      fetchUserData();
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: FormDataType) => ({ ...prev, [name]: value }));
  };

  const handleGenderChange = (value: Gender) => {
    setFormData((prev: FormDataType) => ({ ...prev, gender: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setSuccess(false);
      setError('');

      const dataToSubmit: SubmitFormDataType = { ...formData };

      if (dataToSubmit.tanggalLahir) {
        dataToSubmit.tanggalLahir = new Date(dataToSubmit.tanggalLahir);
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className='flex justify-center items-center min-h-[70vh]'>
        <p>Please log in to view your profile</p>
      </div>
    );
  }

  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-6'>My Profile</h1>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Profile Image Card */}
        <Card>
          <CardContent className='pt-6'>
            <div className='flex flex-col items-center'>
              <div className='relative mb-4'>
                <Image
                  src={user.image || '/images/profile/user-1.jpg'}
                  alt={user.name || 'User'}
                  height={150}
                  width={150}
                  className='rounded-full border-4 border-border shadow-lg'
                />
                <Button
                  size='icon'
                  className='absolute bottom-0 right-0'
                  title='Change profile picture'
                  onClick={() => alert('Image upload functionality will be implemented soon')}
                >
                  <Icon icon='solar:camera-outline' className='h-5 w-5' />
                </Button>
              </div>
              <h2 className='text-xl font-semibold'>{user.name}</h2>
              <p className='text-muted-foreground'>{user.email}</p>
              <div className='mt-2 px-3 py-1 bg-muted rounded-full text-xs font-medium capitalize'>{user.role}</div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form Card */}
        <Card className='md:col-span-2'>
          <CardContent className='pt-6'>
            <form onSubmit={handleSubmit} className='space-y-4'>
              {success && (
                <Alert>
                  <AlertDescription>Success! Your profile has been updated.</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant='destructive'>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className='space-y-2'>
                <Label htmlFor='name'>Full Name</Label>
                <Input id='name' name='name' value={formData.name} onChange={handleChange} required />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input id='email' value={user.email || ''} disabled />
                <p className='text-xs text-muted-foreground'>Email cannot be changed</p>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='namaPanggilan'>Nama Panggilan</Label>
                <Input
                  id='namaPanggilan'
                  name='namaPanggilan'
                  value={formData.namaPanggilan || ''}
                  onChange={handleChange}
                  placeholder='Nama panggilan Anda'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='nomerHandphone'>Nomer Handphone</Label>
                <Input
                  id='nomerHandphone'
                  name='nomerHandphone'
                  value={formData.nomerHandphone || ''}
                  onChange={handleChange}
                  placeholder='Contoh: 08123456789'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='gender'>Gender</Label>
                <Select value={formData.gender} onValueChange={handleGenderChange}>
                  <SelectTrigger>
                    <SelectValue placeholder='Pilih Gender' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='lelaki'>Lelaki</SelectItem>
                    <SelectItem value='perempuan'>Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='tanggalLahir'>Tanggal Lahir</Label>
                <Input id='tanggalLahir' name='tanggalLahir' type='date' value={formData.tanggalLahir || ''} onChange={handleChange} />
              </div>

              <div className='flex justify-end'>
                <Button type='submit' disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icon icon='solar:disk-outline' className='mr-2 h-4 w-4' />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
