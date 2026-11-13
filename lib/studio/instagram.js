// Instagram Graph API publishing (Business/Creator accounts). One image post:
// create a media container from a public JPEG URL, wait for it, publish, read the permalink.
// Env per brand: IG_<BRAND>_USER_ID and IG_<BRAND>_TOKEN (e.g. IG_TSB_USER_ID).
// IG_GRAPH_HOST switches to graph.instagram.com for tokens from "Instagram API with Instagram Login".

const VERSION = 'v23.0';
const host = () => process.env.IG_GRAPH_HOST || 'graph.facebook.com';
const creds = (brandId) => {
  const B = String(brandId).toUpperCase();
  return { user: process.env[`IG_${B}_USER_ID`], token: process.env[`IG_${B}_TOKEN`] };
};
export const instagramConfigured = (brandId) => {
  const { user, token } = creds(brandId);
  return !!(user && token);
};

export const pollPolicy = { delay: 1500, tries: 20 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function graph(path, { method = 'GET', params = {}, token }) {
  const qs = new URLSearchParams({ ...params, access_token: token });
  const u = `https://${host()}/${VERSION}/${path}`;
  const res = await fetch(method === 'GET' ? `${u}?${qs}` : u, method === 'GET' ? {} : { method, body: qs });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || out.error) throw new Error(`instagram ${path}: ${out.error?.message || `HTTP ${res.status}`}`);
  return out;
}

export async function publishImage(brandId, { imageUrl, caption }) {
  const { user, token } = creds(brandId);
  if (!user || !token) throw new Error(`Instagram is not set up for ${brandId}`);
  const { id: container } = await graph(`${user}/media`, { method: 'POST', params: { image_url: imageUrl, caption }, token });
  for (let i = 0; i < pollPolicy.tries; i++) {
    const { status_code: status } = await graph(container, { params: { fields: 'status_code' }, token });
    if (status === 'FINISHED') break;
    if (status === 'ERROR' || status === 'EXPIRED') throw new Error(`instagram: container ${status}`);
    await sleep(pollPolicy.delay);
  }
  const { id: mediaId } = await graph(`${user}/media_publish`, { method: 'POST', params: { creation_id: container }, token });
  const { permalink } = await graph(mediaId, { params: { fields: 'permalink' }, token }).catch(() => ({}));
  return { mediaId, permalink: permalink || null };
}
