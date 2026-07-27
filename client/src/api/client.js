import axios from 'axios';
import { useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const API_URL = process.env.REACT_APP_API_URL;

// Public client — for endpoints that don't need login (browsing products)
export const publicApi = axios.create({ baseURL: API_URL });

// Hook that returns an axios instance which automatically attaches the
// current user's Auth0 access token to every request. The backend then
// verifies that token (see server/middleware/checkJwt.js) before trusting
// the request came from a logged-in user.
export function useApi() {
  const { getAccessTokenSilently } = useAuth0();

  // IMPORTANT: this is wrapped in useCallback so it keeps the same function
  // reference across renders (as long as getAccessTokenSilently itself is
  // stable, which Auth0's SDK guarantees). Several pages put authedRequest
  // in a useEffect dependency array to fetch data on mount — without this
  // memoization, a *new* function is created every render, the effect fires
  // again, the resulting state update causes another render, which creates
  // another new function... an infinite fetch loop that floods the API and
  // trips rate limiting (this was a real bug, not a hypothetical one).
  const authedRequest = useCallback(
    async (config) => {
      const token = await getAccessTokenSilently();
      return axios({
        ...config,
        baseURL: API_URL,
        headers: {
          ...(config.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });
    },
    [getAccessTokenSilently]
  );

  return { authedRequest };
}
