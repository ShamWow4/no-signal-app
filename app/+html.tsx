import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every web page during static rendering.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Google Search Console Verification */}
        <meta name="google-site-verification" content="_Gt8Zct37BZosZ3glre6_SVoUPdOLM_cYQVQpX_zjd8" />

        {/* Base Fallback CSS to prevent raw unstyled image overflow on slow networks */}
        <style dangerouslySetInnerHTML={{ __html: `
          body {
            background-color: #121212;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          a {
            color: #d3a625;
            text-decoration: none;
          }

          /* Custom Scrollbar - Dark Grey Track & Subtle Gold Thumb */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #121212;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(211, 166, 37, 0.4);
            border-radius: 4px;
            border: 1px solid rgba(211, 166, 37, 0.2);
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(211, 166, 37, 0.75);
          }

          /* Firefox & Standard Scrollbar Styling */
          * {
            scrollbar-width: thin;
            scrollbar-color: rgba(211, 166, 37, 0.4) #121212;
          }
        ` }} />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
