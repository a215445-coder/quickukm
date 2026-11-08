import SwiftUI
import WebKit
import UIKit

/// Full-screen WKWebView that hosts the bundled QuickUKM prototype.
/// The web app is self-contained, so no network connection is required.
struct QuickUKMWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.preferences.javaScriptCanOpenWindowsAutomatically = false

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.949, green: 0.957, blue: 0.973, alpha: 1)
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.scrollView.showsHorizontalScrollIndicator = false
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
        webView.allowsBackForwardNavigationGestures = false
        webView.allowsLinkPreview = false
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }

        if let wwwURL = Bundle.main.url(forResource: "www", withExtension: nil) {
            let indexURL = wwwURL.appendingPathComponent("index.html")
            NSLog("QuickUKM www=%@", wwwURL.path)
            NSLog("QuickUKM indexExists=%d", FileManager.default.fileExists(atPath: indexURL.path) ? 1 : 0)
            webView.loadFileURL(indexURL, allowingReadAccessTo: wwwURL)
        } else {
            NSLog("QuickUKM www resource NOT FOUND")
            webView.loadHTMLString(
                "<html><body style='background:#1C168C;color:#fff;font-family:-apple-system;padding:40px'><h2>QuickUKM</h2><p>Bundled web assets are missing. Rebuild the app from the ios folder.</p></body></html>",
                baseURL: nil
            )
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = navigationAction.request.url,
               let scheme = url.scheme?.lowercased(),
               scheme == "http" || scheme == "https" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            NSLog("QuickUKM didFinish url=%@", webView.url?.absoluteString ?? "nil")
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            NSLog("QuickUKM didFail error=%@", error.localizedDescription)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            NSLog("QuickUKM provisionalFail error=%@", error.localizedDescription)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            NSLog("QuickUKM web content terminated")
            webView.reload()
        }
    }
}
