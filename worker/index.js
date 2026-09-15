/**
 * Fallback Worker for requests that are not static assets.
 * SPA navigations are served from dist/ via assets.not_found_handling.
 */
export default {
  fetch() {
    return new Response(null, { status: 404 });
  },
};
