package app.minefield;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public final class MainActivity extends Activity {
    private static final int LIGHT_BARS = Color.rgb(250, 251, 248);
    private static final int DARK_BARS = Color.rgb(25, 27, 31);
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + ASSET_HOST + "/assets/index.html";

    private WebView game;
    private FrameLayout root;
    private boolean currentDark = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        root = new FrameLayout(this);
        root.setBackgroundColor(LIGHT_BARS);
        root.setFitsSystemWindows(true);
        setContentView(root);
        applySystemBars(false);
        setupWebView(savedInstanceState);
    }

    private void setupWebView(Bundle savedInstanceState) {
        try {
            if (game != null) {
                root.removeView(game);
                try {
                    game.stopLoading();
                    game.destroy();
                } catch (Throwable ignored) {
                }
                game = null;
            }
            WebView webView = new WebView(this);
            webView.setBackgroundColor(currentDark ? DARK_BARS : LIGHT_BARS);
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);
            webView.setOnLongClickListener(new View.OnLongClickListener() {
                @Override
                public boolean onLongClick(View view) {
                    return true;
                }
            });

            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);
            settings.setAllowFileAccessFromFileURLs(false);
            settings.setAllowUniversalAccessFromFileURLs(false);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
            String baseUa = settings.getUserAgentString();
            settings.setUserAgentString((baseUa != null ? baseUa : "") + " MinefieldAndroid/1.7.1");

            webView.addJavascriptInterface(new AndroidBridge(), "MinefieldAndroid");
            webView.setWebViewClient(new LocalAssetWebViewClient());
            webView.setWebChromeClient(new WebChromeClient());

            root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            ));
            game = webView;

            if (savedInstanceState != null) {
                webView.restoreState(savedInstanceState);
                if (webView.getUrl() == null) {
                    webView.loadUrl(START_URL);
                }
            } else {
                webView.loadUrl(START_URL);
            }
        } catch (Throwable error) {
            TextView fallback = new TextView(this);
            fallback.setGravity(Gravity.CENTER);
            fallback.setPadding(64, 64, 64, 64);
            fallback.setTextColor(Color.rgb(41, 44, 39));
            fallback.setTextSize(16f);
            fallback.setText("Minefield requires Android System WebView to be enabled.\n\nDetails: " + error.getMessage());
            root.removeAllViews();
            root.addView(fallback, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            ));
        }
    }

    private void applySystemBars(boolean dark) {
        currentDark = dark;
        final int bars = dark ? DARK_BARS : LIGHT_BARS;
        try {
            Window window = getWindow();
            if (window == null) return;
            window.setStatusBarColor(bars);
            window.setNavigationBarColor(bars);
            View decor = window.getDecorView();
            if (Build.VERSION.SDK_INT >= 30) {
                WindowInsetsController controller = window.getInsetsController();
                if (controller != null) {
                    int mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                    controller.setSystemBarsAppearance(dark ? 0 : mask, mask);
                }
            }
            if (decor != null) {
                int flags = decor.getSystemUiVisibility();
                if (dark) {
                    flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    if (Build.VERSION.SDK_INT >= 26) {
                        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    }
                } else {
                    flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    if (Build.VERSION.SDK_INT >= 26) {
                        flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    }
                }
                decor.setSystemUiVisibility(flags);
            }
            if (root != null) root.setBackgroundColor(bars);
            if (game != null) game.setBackgroundColor(bars);
        } catch (Throwable ignored) {
        }
    }

    private static String guessMimeType(String path) {
        String lower = path.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".json") || lower.endsWith(".webmanifest")) return "application/json";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        return "application/octet-stream";
    }

    private final class LocalAssetWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if ("https".equalsIgnoreCase(uri.getScheme()) && ASSET_HOST.equalsIgnoreCase(uri.getHost())) return false;
            // Never give an external page access to our JavaScript bridge.
            if ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()) || "mailto".equalsIgnoreCase(uri.getScheme())) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Throwable ignored) { }
            }
            return true;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            if (request == null) return null;
            Uri uri = request.getUrl();
            if (uri == null) return null;
            if (!"https".equalsIgnoreCase(uri.getScheme()) || !ASSET_HOST.equalsIgnoreCase(uri.getHost())) {
                return null;
            }
            String path = uri.getPath();
            if (path == null || path.isEmpty() || "/".equals(path)) {
                path = "/assets/index.html";
            }
            String assetPath = path.startsWith("/assets/") ? path.substring("/assets/".length()) : path.substring(1);
            if (assetPath.isEmpty()) {
                assetPath = "index.html";
            }
            try {
                InputStream stream = getAssets().open(assetPath);
                String mime = guessMimeType(assetPath);
                Map<String, String> headers = new HashMap<String, String>();
                headers.put("Access-Control-Allow-Origin", "https://" + ASSET_HOST);
                headers.put("Cache-Control", "no-cache");
                return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, stream);
            } catch (Throwable notFound) {
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, null);
            }
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            setupWebView(null);
            return true;
        }
    }

    public final class AndroidBridge {
        @JavascriptInterface
        public void setSystemBars(final boolean dark) {
            MainActivity.this.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    applySystemBars(dark);
                }
            });
        }

        /**
         * Tiny, distinct tactile blips. Deliberately gentle: these are meant to
         * feel like a soft mechanical switch, not an alarm.
         */
        @JavascriptInterface
        public void haptic(final String kind) {
            try {
                Vibrator vibrator;
                if (Build.VERSION.SDK_INT >= 31) {
                    VibratorManager manager = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                    vibrator = manager != null ? manager.getDefaultVibrator() : null;
                } else {
                    vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                }
                if (vibrator == null || !vibrator.hasVibrator()) return;
                String name = kind != null ? kind : "tap";
                long[] pattern;
                int[] amplitudes;
                if ("blip".equals(name)) {
                    pattern = new long[]{0, 10, 26, 14};
                    amplitudes = new int[]{0, 70, 0, 42};
                } else if ("expand".equals(name)) {
                    pattern = new long[]{0, 9, 26, 12, 26, 15};
                    amplitudes = new int[]{0, 45, 0, 62, 0, 82};
                } else if ("mine".equals(name)) {
                    pattern = new long[]{0, 34, 40, 70};
                    amplitudes = new int[]{0, 180, 0, 130};
                } else if ("win".equals(name)) {
                    pattern = new long[]{0, 14, 42, 18, 42, 26};
                    amplitudes = new int[]{0, 80, 0, 110, 0, 155};
                } else {
                    pattern = new long[]{0, 11, 20, 10};
                    amplitudes = new int[]{0, 55, 0, 36};
                }
                if (Build.VERSION.SDK_INT >= 26) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, amplitudes, -1));
                } else {
                    vibrator.vibrate(pattern, -1);
                }
            } catch (Throwable ignored) {
            }
        }

        @JavascriptInterface
        public void share(final String text) {
            final Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("text/plain");
            intent.putExtra(Intent.EXTRA_SUBJECT, "A little win on Minefield");
            intent.putExtra(Intent.EXTRA_TEXT, text != null ? text : "");
            MainActivity.this.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        startActivity(Intent.createChooser(intent, "Share a little win"));
                    } catch (Throwable ignored) {
                    }
                }
            });
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (game != null && outState != null) {
            try {
                game.saveState(outState);
            } catch (Throwable ignored) {
            }
        }
        super.onSaveInstanceState(outState);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && game != null && game.canGoBack()) {
            game.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onPause() {
        if (game != null) {
            try {
                game.onPause();
            } catch (Throwable ignored) {
            }
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (game != null) {
            try {
                game.onResume();
            } catch (Throwable ignored) {
            }
        }
    }

    @Override
    protected void onDestroy() {
        if (game != null) {
            try {
                if (root != null) {
                    root.removeView(game);
                }
                game.stopLoading();
                game.destroy();
            } catch (Throwable ignored) {
            }
            game = null;
        }
        super.onDestroy();
    }
}
