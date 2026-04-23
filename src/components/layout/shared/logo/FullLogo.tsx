'use client';
import React from 'react';
import Image from 'next/image';
// import Logo from "/public/images/logos/dark-logo.svg";
import Logo from '/public/images/logos/logo-voltaic.png';
import Logowhite from '/public/images/logos/light-logo.svg';
import Link from 'next/link';
const FullLogo = () => {
  return (
    <div className="flex flex-col items-center">
      <Link href={'/'} className="flex justify-center">
        {/* Dark Logo   */}
        <Image 
          src={Logo} 
          alt='logo' 
          className='block dark:hidden rtl:scale-x-[-1]' 
          width={100}
          height={30}
          priority
        />
        {/* Light Logo  */}
        <Image 
          src={Logowhite} 
          alt='logo' 
          className='hidden dark:block rtl:scale-x-[-1]' 
          width={100}
          height={30}
          priority
        />
      </Link>
      <span className="text-xs font-medium text-foreground mt-1">Innovation Management</span>
    </div>
  );
};

export default FullLogo;
