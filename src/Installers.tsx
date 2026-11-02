import { ArrowDownToLine, Monitor, Smartphone } from 'lucide-react';

export const RELEASE_PAGE = 'https://github.com/maxaroo198/minesweeper/releases/latest';
export const INSTALLERS = [
  { name: 'Android APK', asset: 'minefield-android.apk', detail: 'Android 8+ · independently signed APK', icon: Smartphone },
  { name: 'Windows installer', asset: 'minefield-windows-x64-setup.exe', detail: 'Windows 10/11 · 64-bit · unsigned installer', icon: Monitor },
  { name: 'Linux AppImage', asset: 'minefield-linux-x86_64.AppImage', detail: '64-bit Linux · make executable before opening', icon: Monitor },
  { name: 'Linux Debian package', asset: 'minefield-linux-amd64.deb', detail: 'Debian/Ubuntu-compatible Linux · 64-bit', icon: Monitor },
];

export default function Installers() {
  return <div className="installer-list">
    <p>Install the game for offline play. Stats and Branch progress save separately on each device. The public leaderboard needs internet.</p>
    {INSTALLERS.map(({ name, asset, detail, icon: Icon }) => <a key={asset} className="secondary-button full-width installer-link" href={`${RELEASE_PAGE}/download/${asset}`} target="_blank" rel="noopener noreferrer"><Icon size={20} /><span><b>{name}</b><small>{detail}</small></span><ArrowDownToLine size={18} /></a>)}
    <p><a href={RELEASE_PAGE} target="_blank" rel="noopener noreferrer">Release notes and SHA-256 checksums ↗</a>. Downloads become available after the first installer release is published.</p>
    <div className="install-guide"><h4>Install & keep your saves</h4>
      <p><span>1</span>Android: open the APK and allow installation from your browser/file manager if you trust this release. Keep Play Protect enabled.</p>
      <p><span>2</span>Windows: run the installer. It is not code-signed, so Windows may warn about an unknown publisher. Verify the release before proceeding.</p>
      <p><span>3</span>Linux: use the .deb package or mark the AppImage executable. AppImage may need FUSE installed.</p>
      <p>For updates, install over the existing app. Do not uninstall or clear app data to update. Android updates must use the same signing key. Browser saves are separate from installed-app saves.</p>
    </div>
  </div>;
}
