import Foundation
import Capacitor
import UIKit

// CANA — native share sheet for the encrypted .cana transfer file, and
// native PDF rendering for the report pages.
// -----------------------------------------------------------------------------
// WKWebView cannot download blobs and window.print() is a no-op inside it, so
// both the JS <a download> path and the "Save as PDF" print path are inert on
// iOS. This plugin covers both: `share` writes a text export to a temp file,
// `sharePdf` renders the web view's print formatter (honoring the app's
// @media print CSS) into a paginated A4 PDF. Either way the system
// UIActivityViewController is presented — AirDrop, save to Files, Mail with
// the file attached. Nothing leaves the device unless the user sends it.
//
// JS API: ShareFile.share({ filename, text }) / ShareFile.sharePdf({ filename })
// -> { ok: true } once the sheet is dismissed.

@objc(ShareFilePlugin)
public class ShareFilePlugin: CAPPlugin, CAPBridgedPlugin {
    // Capacitor 6 registration: the bridge discovers plugins via the
    // CAPBridgedPlugin protocol — the old CAP_PLUGIN ObjC macro no longer
    // registers anything.
    public let identifier = "ShareFilePlugin"
    public let jsName = "ShareFile"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sharePdf", returnType: CAPPluginReturnPromise),
    ]

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

    @objc func sharePdf(_ call: CAPPluginCall) {
        guard let filename = call.getString("filename")?
                .replacingOccurrences(of: "/", with: "-")
                .replacingOccurrences(of: ":", with: "-"),
              !filename.isEmpty else {
            call.reject("Missing filename")
            return
        }
        DispatchQueue.main.async {
            guard let webView = self.bridge?.webView, let vc = self.bridge?.viewController else {
                call.reject("No web view available")
                return
            }
            // The print formatter applies the app's @media print CSS, so the
            // PDF shows the designed .print-only pages, not the screen UI.
            let renderer = UIPrintPageRenderer()
            renderer.addPrintFormatter(webView.viewPrintFormatter(), startingAtPageAt: 0)
            // A4 in points; insets mirror the @page margins in styles.css.
            let paper = CGRect(x: 0, y: 0, width: 595.2, height: 841.8)
            renderer.setValue(paper, forKey: "paperRect")
            renderer.setValue(paper.insetBy(dx: 40, dy: 45), forKey: "printableRect")
            let pageCount = renderer.numberOfPages
            guard pageCount > 0 else {
                call.reject("Nothing to render")
                return
            }
            let data = NSMutableData()
            UIGraphicsBeginPDFContextToData(data, paper, nil)
            renderer.prepare(forDrawingPages: NSRange(location: 0, length: pageCount))
            for i in 0..<pageCount {
                UIGraphicsBeginPDFPage()
                renderer.drawPage(at: i, in: UIGraphicsGetPDFContextBounds())
            }
            UIGraphicsEndPDFContext()
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
            do {
                try (data as Data).write(to: url)
            } catch {
                call.reject("Could not write the PDF file: \(error.localizedDescription)")
                return
            }
            let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            sheet.completionWithItemsHandler = { _, completed, _, _ in
                call.resolve(["ok": true, "completed": completed])
            }
            if let pop = sheet.popoverPresentationController {
                pop.sourceView = vc.view
                pop.sourceRect = CGRect(x: vc.view.bounds.midX, y: vc.view.bounds.midY, width: 0, height: 0)
                pop.permittedArrowDirections = []
            }
            vc.present(sheet, animated: true)
        }
    }
}
