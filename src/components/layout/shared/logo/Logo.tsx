'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const Logo = () => {
  return (
    <Link href={'/'} className="inline-flex items-center" aria-label="NAWASENA">
      <Image
        src="/images/logos/Logo-its-biru-transparan.webp"
        alt="Logo ITS"
        width={48}
        height={48}
        priority
        className="h-12 w-12 object-contain"
      />
    </Link>
  );
};

export default Logo;
