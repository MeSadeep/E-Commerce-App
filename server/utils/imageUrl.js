function isImageUrl(value) {
  if (typeof value !== 'string') return false;
  if (/^\/images\/products\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|avif)$/i.test(value)) return true;
  try {const u = new URL(value); return ['http:','https:'].includes(u.protocol) && !!u.hostname && !u.username && !u.password;} catch {return false;}
}
module.exports = {isImageUrl};
