#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registers the native share sheet with Capacitor under the JS name
// "ShareFile" (used by the export flow in src/App.jsx on iOS).
CAP_PLUGIN(ShareFilePlugin, "ShareFile",
  CAP_PLUGIN_METHOD(share, CAPPluginReturnPromise);
)
