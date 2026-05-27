export function getAvatarSrc(user: any) {
  try {
    if (!user) return '';
    const p = user.profilePhoto || user.profile_photo;
    if (p && String(p).trim()) return String(p).trim();
    const a = user.avatar || '';
    if (a && String(a).trim()) return '';
    return '';
  } catch (e) {
    return '';
  }
}

export default getAvatarSrc;
