#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registers the iOS Keychain credential store with Capacitor under the JS
// name "Credentials" (looked up by src/credentials.js).
CAP_PLUGIN(CredentialsPlugin, "Credentials",
  CAP_PLUGIN_METHOD(available, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(save, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(get, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(remove, CAPPluginReturnPromise);
)
