import Foundation
import Capacitor
import UIKit

// CANA — native share sheet for the encrypted .cana transfer file.
// -----------------------------------------------------------------------------
// WKWebView cannot download blobs, so the JS <a download> path is inert on
// iOS. This plugin writes the export to a temp file and presents the system
// UIActivityViewController — AirDrop to the partner's iPhone, save to Files,
// or send via Mail/Messages. The file is passphrase-encrypted by the JS layer
// before it ever reaches this plugin; nothing readable leaves the device.
//
// JS API: ShareFile.share({ filename, text }) -> { ok: true } once the sheet
// is dismissed (regardless of which activity, or none, was chosen).

@objc(ShareFilePlugin)
public class ShareFilePlugin: CAPPlugin {

    @objc func share(_ call: CAPPluginCall) {
        guard let filename = call.getString("filename")?
                .replacingOccurrences(of: "/", with: "-")
                .replacingOccurrences(of: ":", with: "-"),
              !filename.isEmpty,
              let text = call.getString("text") else {
            call.reject("Missing filename or text")
            return
        }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        do {
            try text.write(to: url, atomically: true, encoding: .utf8)
        } catch {
            call.reject("Could not write the export file: \(error.localizedDescription)")
            return
        }
        DispatchQueue.main.async {
            guard let vc = self.bridge?.viewController else {
                call.reject("No view controller available")
                return
            }
            let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            sheet.completionWithItemsHandler = { _, completed, _, _ in
                call.resolve(["ok": true, "completed": completed])
            }
            // iPad requires a popover anchor; centered, arrowless.
            if let pop = sheet.popoverPresentationController {
                pop.sourceView = vc.view
                pop.sourceRect = CGRect(x: vc.view.bounds.midX, y: vc.view.bounds.midY, width: 0, height: 0)
                pop.permittedArrowDirections = []
            }
            vc.present(sheet, animated: true)
        }
    }
}
