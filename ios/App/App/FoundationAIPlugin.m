#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registers the FoundationAI plugin and its methods with the Capacitor bridge,
// so JavaScript can call FoundationAI.isAvailable() and FoundationAI.generate().
// This file must live alongside FoundationAIPlugin.swift in the Xcode project
// (typically under App/App/). The CAP_PLUGIN name "FoundationAI" must match the
// registerPlugin('FoundationAI', ...) call on the JS side.

CAP_PLUGIN(FoundationAIPlugin, "FoundationAI",
    CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(generate, CAPPluginReturnPromise);
)
