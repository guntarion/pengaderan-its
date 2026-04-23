// src/Components/ViewContent/MarkdownRenderer.tsx
import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';

/**
 * MarkdownRenderer Component
 *
 * This component renders Markdown content with GitHub Flavored Markdown support
 * and Mermaid diagrams support for flowcharts, mindmaps, quadrant charts, etc.
 *
 * @param {Object} props - Component props
 * @param {string} props.content - The markdown content to render
 */
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'neutral',
      securityLevel: 'loose',
      // Additional configuration
      flowchart: { useMaxWidth: true, htmlLabels: true },
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });

    // Render any mermaid diagrams
    setTimeout(() => {
      mermaid.init(undefined, document.querySelectorAll('.mermaid'));
    }, 200);
  }, [content]);

  return (
    <div className='markdown-content prose prose-blue max-w-none dark:prose-invert prose-ul:list-disc prose-ol:list-decimal'>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom rendering for code blocks to support mermaid
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');

            // Handle mermaid diagrams
            if (match && match[1] === 'mermaid') {
              return <div className='mermaid text-center my-8 overflow-x-auto'>{String(children).replace(/\n$/, '')}</div>;
            }

            // Standard code block
            return (
              <pre className={className}>
                <code {...props}>{children}</code>
              </pre>
            );
          },
          // Custom rendering for tables to make them responsive with border lines
          table: ({ ...props }) => (
            <div className='overflow-x-auto my-8'>
              <table className='min-w-full border border-gray-300 dark:border-gray-700 divide-y divide-gray-300 dark:divide-gray-700' {...props} />
            </div>
          ),
          // Custom rendering for table headers with borders
          th: ({ ...props }) => (
            <th
              className='px-6 py-3 bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-300 dark:border-gray-700 last:border-r-0'
              {...props}
            />
          ),
          // Custom rendering for table cells with borders
          td: ({ ...props }) => (
            <td
              className='px-6 py-4 whitespace-normal text-sm text-gray-500 dark:text-gray-400 border-r border-b border-gray-300 dark:border-gray-700 last:border-r-0'
              {...props}
            />
          ),
          // Custom rendering for table rows with bottom borders
          tr: ({ ...props }) => <tr className='bg-white dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800' {...props} />,
          // Improve heading styles
          h1: ({ ...props }) => <h1 className='text-3xl font-bold mt-8 mb-4 text-gray-900 dark:text-white' {...props} />,
          h2: ({ ...props }) => <h2 className='text-2xl font-bold mt-6 mb-3 text-gray-900 dark:text-white' {...props} />,
          h3: ({ ...props }) => <h3 className='text-xl font-semibold mt-5 mb-2 text-gray-900 dark:text-white' {...props} />,
          // Custom list rendering
          ul: ({ ...props }) => <ul className='list-disc pl-6 my-4 text-gray-700 dark:text-gray-300' {...props} />,
          ol: ({ ...props }) => <ol className='list-decimal pl-6 my-4 text-gray-700 dark:text-gray-300' {...props} />,
          // Custom list item rendering
          li: ({ ...props }) => <li className='mb-1 ml-2' {...props} />,
          // Improve strong (bold) text styling
          strong: ({ ...props }) => <strong className='font-bold text-gray-900 dark:text-white' {...props} />,
          // Improve emphasis (italics) styling
          em: ({ ...props }) => <em className='italic text-gray-800 dark:text-gray-200' {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;