import Foundation
import Capacitor
import Security

// CANA — iOS Keychain credential store.
// -----------------------------------------------------------------------------
// Backs the "Remember password" option on the sign-in screen. WKWebView apps
// never get Safari's "save this password?" sheet (the app runs on
// capacitor://localhost, not a real domain), so we store the profile password
// in the iOS Keychain ourselves, opt-in from the UI.
//
// Storage: kSecClassGenericPassword, service fixed, account = lowercased email.
// kSecAttrAccessibleWhenUnlockedThisDeviceOnly — readable only while the
// device is unlocked, never synced off the device, wiped with the app's
// keychain on uninstall+reinstall cycles per iOS policy. Matches CANA's
// "stays on this device" promise (data doesn't sync either).
//
// JS API (src/credentials.js): Credentials.available() / save({email,password})
// / get({email}) -> {ok, password?} / remove({email}).

@objc(CredentialsPlugin)
public class CredentialsPlugin: CAPPlugin {
    private let service = "com.cana.covenantlife.profile-passwords"

    private func baseQuery(_ email: String) -> [String: Any] {
        return [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: email,
        ]
    }

    @objc func available(_ call: CAPPluginCall) {
        call.resolve(["available": true])
    }

    @objc func save(_ call: CAPPluginCall) {
        guard let email = call.getString("email")?.trimmingCharacters(in: .whitespaces).lowercased(),
              !email.isEmpty,
              let password = call.getString("password"),
              let data = password.data(using: .utf8) else {
            call.resolve(["ok": false])
            return
        }
        // Upsert: delete any previous item, then add fresh.
        SecItemDelete(baseQuery(email) as CFDictionary)
        var attrs = baseQuery(email)
        attrs[kSecValueData as String] = data
        attrs[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        let status = SecItemAdd(attrs as CFDictionary, nil)
        call.resolve(["ok": status == errSecSuccess])
    }

    @objc func get(_ call: CAPPluginCall) {
        guard let email = call.getString("email")?.trimmingCharacters(in: .whitespaces).lowercased(),
              !email.isEmpty else {
            call.resolve(["ok": false])
            return
        }
        var query = baseQuery(email)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &out)
        if status == errSecSuccess, let d = out as? Data, let pw = String(data: d, encoding: .utf8) {
            call.resolve(["ok": true, "password": pw])
        } else {
            call.resolve(["ok": false])
        }
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let email = call.getString("email")?.trimmingCharacters(in: .whitespaces).lowercased(),
              !email.isEmpty else {
            call.resolve(["ok": false])
            return
        }
        let status = SecItemDelete(baseQuery(email) as CFDictionary)
        call.resolve(["ok": status == errSecSuccess || status == errSecItemNotFound])
    }
}
