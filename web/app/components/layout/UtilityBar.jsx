export function UtilityBar({ settings }) {
  if (!settings) return null;
  return (
    <div className="bg-ink text-sm text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <a href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`} className="hover:underline">
            Call us: {settings.phone}
          </a>
          <a href={`mailto:${settings.email}`} className="hover:underline">
            {settings.email}
          </a>
        </div>
        <a
          href={settings.lmsUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-accent px-3 py-0.5 font-semibold text-ink hover:bg-accent-dark"
        >
          Learning Portal
        </a>
      </div>
    </div>
  );
}
