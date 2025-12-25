// src/helpers/http.js
exports.fetchJson = async (url, { sourceName = "HTTP", bestEffort = false } = {}) => {
  const resp = await fetch(url);

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    const err = new Error(`${sourceName} error ${resp.status}: ${text || resp.statusText}`);
    err.statusCode = resp.status;

    // best-effort means: throw, but caller catches; or you could return null here.
    throw err;
  }

  return resp.json();
};
