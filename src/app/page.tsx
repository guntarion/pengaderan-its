import { redirect } from 'next/navigation';

/**
 * Root page that redirects to the landing page or dashboard
 */
export default function Home() {
  // Redirect to the landing page route that doesn't have authentication checks
  redirect('/landingpage');
}
