import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData
} from 'react-router';
import { apiGet } from './lib/api.server.js';
import { UtilityBar } from './components/layout/UtilityBar.jsx';
import { Header } from './components/layout/Header.jsx';
import { Footer } from './components/layout/Footer.jsx';
import './styles/app.css';

// Site-wide contact details for the header and footer, rendered on the server.
// If the API is unreachable the page still renders, without contact details.
export async function loader({ request }) {
  try {
    const { settings } = await apiGet('/site-settings', request);
    return { settings };
  } catch (err) {
    console.error('site settings unavailable:', err.message);
    return { settings: null };
  }
}

export function Layout({ children }) {
  return (
    <html lang="en-CA">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-surface font-sans text-body antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { settings } = useLoaderData();
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <UtilityBar settings={settings} />
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer settings={settings} />
    </>
  );
}

export function ErrorBoundary({ error }) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold text-ink">
        {notFound ? 'Page not found' : 'Something went wrong'}
      </h1>
      <p className="mt-3 text-muted">
        {notFound
          ? 'The page you are looking for does not exist.'
          : 'Please try again in a moment.'}
      </p>
      <a href="/" className="mt-6 inline-block text-brand underline">
        Go to the homepage
      </a>
    </main>
  );
}
