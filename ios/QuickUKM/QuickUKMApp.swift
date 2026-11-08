import SwiftUI

@main
struct QuickUKMApp: App {
    var body: some Scene {
        WindowGroup {
            QuickUKMWebView()
                .ignoresSafeArea()
                .preferredColorScheme(.light)
        }
    }
}
