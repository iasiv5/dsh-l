export function armInterval({ interval, getMinutes, refresh }) {
  let off = null;
  const rearm = () => {
    off?.();
    off = null;
    const minutes = Number(getMinutes() ?? 0);
    if (Number.isInteger(minutes) && minutes > 0) {
      off = interval(() => { Promise.resolve().then(refresh).catch(() => {}); }, minutes * 60000);
    }
  };
  rearm();
  return { dispose: () => { off?.(); off = null; }, rearm };
}
