import UIKit
import Capacitor

// CANA — bridge view controller that registers the app-local plugins.
// -----------------------------------------------------------------------------
// Capacitor 6 instantiates plugins from the packageClassList that `cap sync`
// generates from installed npm packages. Plugins living INSIDE the app target
// (ShareFile, Credentials, FoundationAI) are on no such list — conforming to
// CAPBridgedPlugin only describes their methods, it does not register them.
// Without this explicit registration every call rejects with
// "<name>" plugin is not implemented on ios.
// Main.storyboard points its view controller at this class.

class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ShareFilePlugin())
        bridge?.registerPluginInstance(CredentialsPlugin())
        bridge?.registerPluginInstance(FoundationAIPlugin())
    }
}
