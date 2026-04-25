'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const FullLogo = () => {
  return (
    <Link href={'/'} className="flex items-center gap-2.5" aria-label="NAWASENA — Pengaderan ITS">
      <Image
        src="/images/logos/Logo-its-biru-transparan.webp"
        alt="Logo ITS"
        width={36}
        height={36}
        priority
        className="h-9 w-9 object-contain"
      />
      <div className="flex flex-col leading-tight">
        <span className="text-base font-bold tracking-wide text-sky-700 dark:text-sky-300">
          NAWASENA
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Pengaderan ITS
        </span>
      </div>
    </Link>
  );
};

export default FullLogo;
