import { APK_BASE64 } from './apkData';

export interface AndroidDownloads {
  hasEmbeddedApk: boolean;
  apkBytes: Uint8Array | null;
  xapkBytes: Uint8Array | null;
  apkSizeKb: number;
  xapkSizeKb: number;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildStoreZip(entries: { name: string; data: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder();
  const prepared = entries.map(entry => ({
    nameBytes: encoder.encode(entry.name),
    data: entry.data,
    crc: crc32(entry.data),
    offset: 0,
  }));

  let localSize = 0;
  let centralSize = 0;
  for (const item of prepared) {
    item.offset = localSize;
    localSize += 30 + item.nameBytes.length + item.data.length;
    centralSize += 46 + item.nameBytes.length;
  }

  const total = localSize + centralSize + 22;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let pos = 0;

  for (const item of prepared) {
    view.setUint32(pos, 0x04034b50, true);
    view.setUint16(pos + 4, 20, true);
    view.setUint16(pos + 6, 0x0800, true); // UTF-8 filename flag
    view.setUint16(pos + 8, 0, true); // STORE method
    view.setUint16(pos + 10, 0, true);
    view.setUint16(pos + 12, 0x5621, true);
    view.setUint32(pos + 14, item.crc, true);
    view.setUint32(pos + 18, item.data.length, true);
    view.setUint32(pos + 22, item.data.length, true);
    view.setUint16(pos + 26, item.nameBytes.length, true);
    view.setUint16(pos + 28, 0, true);
    out.set(item.nameBytes, pos + 30);
    out.set(item.data, pos + 30 + item.nameBytes.length);
    pos += 30 + item.nameBytes.length + item.data.length;
  }

  const centralStart = pos;
  for (const item of prepared) {
    view.setUint32(pos, 0x02014b50, true);
    view.setUint16(pos + 4, 20, true);
    view.setUint16(pos + 6, 20, true);
    view.setUint16(pos + 8, 0x0800, true);
    view.setUint16(pos + 10, 0, true);
    view.setUint16(pos + 12, 0, true);
    view.setUint16(pos + 14, 0x5621, true);
    view.setUint32(pos + 16, item.crc, true);
    view.setUint32(pos + 20, item.data.length, true);
    view.setUint32(pos + 24, item.data.length, true);
    view.setUint16(pos + 28, item.nameBytes.length, true);
    view.setUint16(pos + 30, 0, true);
    view.setUint16(pos + 32, 0, true);
    view.setUint16(pos + 34, 0, true);
    view.setUint16(pos + 36, 0, true);
    view.setUint32(pos + 38, 0, true);
    view.setUint32(pos + 42, item.offset, true);
    out.set(item.nameBytes, pos + 46);
    pos += 46 + item.nameBytes.length;
  }

  view.setUint32(pos, 0x06054b50, true);
  view.setUint16(pos + 4, 0, true);
  view.setUint16(pos + 6, 0, true);
  view.setUint16(pos + 8, prepared.length, true);
  view.setUint16(pos + 10, prepared.length, true);
  view.setUint32(pos + 12, centralSize, true);
  view.setUint32(pos + 16, centralStart, true);
  view.setUint16(pos + 20, 0, true);

  return out;
}

function decodeBase64(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

let cachedDownloads: AndroidDownloads | null = null;

export function getAndroidDownloads(): AndroidDownloads {
  if (cachedDownloads) return cachedDownloads;
  if (!APK_BASE64 || APK_BASE64.length < 100) {
    cachedDownloads = {
      hasEmbeddedApk: false,
      apkBytes: null,
      xapkBytes: null,
      apkSizeKb: 0,
      xapkSizeKb: 0,
    };
    return cachedDownloads;
  }

  const apkBytes = decodeBase64(APK_BASE64);
  const manifest = JSON.stringify(
    {
      xapk_version: 2,
      package_name: 'app.minefield',
      name: 'Minefield',
      version_code: '2',
      version_name: '1.0.1',
      min_sdk_version: '26',
      target_sdk_version: '35',
      permissions: ['android.permission.INTERNET'],
      total_size: apkBytes.length,
      apks: [
        {
          file: 'app.minefield.apk',
          id: 'base',
        },
      ],
    },
    null,
    2
  );
  const xapkBytes = buildStoreZip([
    { name: 'manifest.json', data: new TextEncoder().encode(manifest) },
    { name: 'app.minefield.apk', data: apkBytes },
  ]);

  cachedDownloads = {
    hasEmbeddedApk: true,
    apkBytes,
    xapkBytes,
    apkSizeKb: Math.round(apkBytes.length / 1024),
    xapkSizeKb: Math.round(xapkBytes.length / 1024),
  };
  return cachedDownloads;
}

export function createAndroidUrls(): { apkUrl: string | null; xapkUrl: string | null; apkDirectDataUrl: string | null; revoke: () => void } {
  const pkg = getAndroidDownloads();
  if (!pkg.hasEmbeddedApk || !pkg.apkBytes || !pkg.xapkBytes) {
    return { apkUrl: null, xapkUrl: null, apkDirectDataUrl: null, revoke: () => {} };
  }
  const apkDirectDataUrl = `data:application/vnd.android.package-archive;base64,${APK_BASE64.replace(/\s+/g, '')}`;
  const isOpaqueOrigin = typeof window !== 'undefined' && (!window.origin || window.origin === 'null');
  const urls: string[] = [];
  const makeUrl = (bytes: Uint8Array, mime: string, fallback: string): string => {
    if (isOpaqueOrigin && fallback) return fallback;
    try {
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      const url = URL.createObjectURL(new Blob([copy.buffer], { type: mime }));
      urls.push(url);
      return url;
    } catch {
      return fallback;
    }
  };
  const xapkB64 = (() => {
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < pkg.xapkBytes.length; i += chunk) {
      bin += String.fromCharCode(...pkg.xapkBytes.subarray(i, i + chunk));
    }
    return `data:application/octet-stream;base64,${btoa(bin)}`;
  })();
  return {
    apkUrl: makeUrl(pkg.apkBytes, 'application/vnd.android.package-archive', apkDirectDataUrl),
    xapkUrl: makeUrl(pkg.xapkBytes, 'application/octet-stream', xapkB64),
    apkDirectDataUrl,
    revoke: () => urls.forEach(u => URL.revokeObjectURL(u)),
  };
}

export function triggerBinaryDownload(bytes: Uint8Array, filename: string, mimeType: string): boolean {
  try {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const blob = new Blob([copy.buffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return true;
  } catch {
    return false;
  }
}
