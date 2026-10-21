// The GitHub token lives only in sessionStorage: it is gone when the tab closes.
// Never localStorage — other apps served from kinojms.github.io share that origin.
const KEY = "portfolio-editor-token";

export const getToken = () => {
  try {
    return sessionStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
};

export const setToken = (token: string) => {
  try {
    sessionStorage.setItem(KEY, token);
  } catch {}
};

export const clearToken = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
};

/** Opens GitHub's fine-grained token form with the name, owner and permissions pre-filled. */
export const TOKEN_URL =
  "https://github.com/settings/personal-access-tokens/new" +
  "?name=Portfolio%20editor" +
  "&description=Edits%20kinojms.github.io%20from%20%2Fedit" +
  "&target_name=kinojms" +
  "&expires_in=90" +
  "&contents=write" +
  "&pull_requests=write";
