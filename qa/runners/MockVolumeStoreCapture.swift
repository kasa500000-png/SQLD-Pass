import XCTest
import UIKit

// Official-test-ad bundle only. This runner never seeds advertising grants or learner data.
final class CaptureTests: XCTestCase {
 @MainActor func el(_ a:XCUIApplication,_ id:String)->XCUIElement {let b=a.buttons.matching(identifier:id).firstMatch;return b.exists ? b:a.descendants(matching:.any).matching(identifier:id).firstMatch}
 @MainActor func tap(_ a:XCUIApplication,_ id:String){let e=el(a,id);XCTAssertTrue(e.waitForExistence(timeout:12),id);for _ in 0..<24 {if e.isHittable{break};let down=e.frame.minY<120;let v=a.scrollViews.allElementsBoundByIndex.filter{$0.frame.height>100 && $0.isHittable}.max{$0.frame.height<$1.frame.height};guard let v else {break};let top=v.coordinate(withNormalizedOffset:CGVector(dx:0.12,dy:0.2)),bottom=v.coordinate(withNormalizedOffset:CGVector(dx:0.12,dy:0.8));(down ? top:bottom).press(forDuration:0.05,thenDragTo:down ? bottom:top)};XCTAssertTrue(e.isHittable,id);e.tap()}
 @MainActor func cap(_ a:XCUIApplication,_ name:String){let dir=URL(fileURLWithPath:"/tmp/sqld040-store-captures/\(UIDevice.current.userInterfaceIdiom == .pad ? "ipad":"iphone")-\(Int(a.frame.width))");try? FileManager.default.createDirectory(at:dir,withIntermediateDirectories:true);try? XCUIScreen.main.screenshot().pngRepresentation.write(to:dir.appendingPathComponent(name+".png"));try? a.debugDescription.write(to:dir.appendingPathComponent(name+".txt"),atomically:true,encoding:.utf8);print("MOCK60-CAPTURE \(dir.path)/\(name)")}
 @MainActor func testCaptureStoreCatalog() throws {
  continueAfterFailure=false;let a=XCUIApplication(bundleIdentifier:"com.sqldpass.app.adsqa");a.launch()
  if el(a,"textbook-start").waitForExistence(timeout:3){tap(a,"textbook-start");tap(a,"save-textbook-settings")}
  tap(a,"tab-exams");tap(a,"mock-volume-vol2");cap(a,"040-volume2")
 }
}
