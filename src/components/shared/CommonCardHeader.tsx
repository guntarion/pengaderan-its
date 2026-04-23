// src/app/components/shared/CommonCardHeader.tsx
// This component displays a card header with a main heading and optional subheadings

interface SubHeading {
  text: string;
}

interface CommonCardHeaderProps {
  heading: string;
  subHeading?: SubHeading[];
}

const CommonCardHeader = ({ heading, subHeading }: CommonCardHeaderProps) => {
  return (
    <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
      <h4 className='text-xl font-medium text-gray-800 dark:text-gray-200 mb-2'>{heading}</h4>
      {subHeading && subHeading.length > 0 && (
        <div className='space-y-1'>
          {subHeading.map((sh, index) => (
            <p key={index} className='text-sm text-gray-600 dark:text-gray-400'>
              {sh.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommonCardHeader;
