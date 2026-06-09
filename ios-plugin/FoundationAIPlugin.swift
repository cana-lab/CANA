import Foundation
import Capacitor

// CANA — Apple Foundation Model bridge.
// -----------------------------------------------------------------------------
// Exposes the on-device Apple Foundation Model (Apple Intelligence, iOS 26+) to
// the JavaScript layer as a Capacitor plugin named "FoundationAI".
//
// JS API (see src/foundationModel.js):
//   FoundationAI.isAvailable()                  -> { available: Bool, reason: String }
//   FoundationAI.generate({ prompt, system })   -> { text: String }
//
// Privacy: the Apple Foundation Model runs entirely on the device. Prompts and
// output never leave the phone, preserving CANA's "your words stay on your
// device" promise. If the model is unavailable (older OS / unsupported device /
// Apple Intelligence off / older Xcode SDK), isAvailable() returns false and the
// app falls back to its deterministic text — exactly as on desktop without Ollama.
//
// IMPORTANT — why the gate is `compiler(>=6.2)` and not just `canImport`:
// The FoundationModels *types* (SystemLanguageModel, LanguageModelSession) only
// exist in the iOS 26 SDK, which ships with Xcode 26 (Swift 6.2+). On an older
// Xcode, `canImport(FoundationModels)` can still be true, so the compiler would
// try to build those symbols and FAIL with "Cannot find 'SystemLanguageModel'".
// Gating on the Swift compiler version means: older Xcode skips this code
// entirely and reports "unavailable" (app uses deterministic text); a current
// Xcode with the iOS 26 SDK compiles it and the Apple model activates
// automatically. This lets the project build on ANY Xcode today, with the AI
// switching on later with no code change.

#if compiler(>=6.2) && canImport(FoundationModels)
import FoundationModels
#endif

@objc(FoundationAIPlugin)
public class FoundationAIPlugin: CAPPlugin {

    @objc func isAvailable(_ call: CAPPluginCall) {
        #if compiler(>=6.2) && canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            let model = SystemLanguageModel.default
            switch model.availability {
            case .available:
                call.resolve(["available": true, "reason": "ready"])
            case .unavailable(let reason):
                call.resolve(["available": false, "reason": "\(reason)"])
            @unknown default:
                call.resolve(["available": false, "reason": "unknown"])
            }
            return
        }
        #endif
        call.resolve(["available": false, "reason": "On-device AI requires iOS 26 with Apple Intelligence (built with the iOS 26 SDK)."])
    }

    @objc func generate(_ call: CAPPluginCall) {
        let prompt = call.getString("prompt") ?? ""
        let system = call.getString("system") ?? ""
        if prompt.isEmpty {
            call.reject("Empty prompt")
            return
        }

        #if compiler(>=6.2) && canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            Task {
                do {
                    // A fresh session per call keeps requests independent (no
                    // cross-conversation context, matching the stateless desktop calls).
                    let session: LanguageModelSession
                    if system.isEmpty {
                        session = LanguageModelSession()
                    } else {
                        session = LanguageModelSession(instructions: system)
                    }
                    let response = try await session.respond(to: prompt)
                    call.resolve(["text": response.content])
                } catch {
                    call.reject("Generation failed: \(error.localizedDescription)")
                }
            }
            return
        }
        #endif
        call.reject("On-device AI not available on this device or SDK")
    }
}
