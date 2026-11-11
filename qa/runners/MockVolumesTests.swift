import XCTest
import UIKit

// Official-test-ad bundle only. This runner never seeds advertising grants or learner data.
final class CaptureTests: XCTestCase {
 @MainActor func el(_ a:XCUIApplication,_ id:String)->XCUIElement {let b=a.buttons.matching(identifier:id).firstMatch;return b.exists ? b:a.descendants(matching:.any).matching(identifier:id).firstMatch}
 @MainActor func tap(_ a:XCUIApplication,_ id:String){let e=el(a,id);XCTAssertTrue(e.waitForExistence(timeout:12),id);for _ in 0..<24 {if e.isHittable{break};let down=e.frame.minY<120;let v=a.scrollViews.allElementsBoundByIndex.filter{$0.frame.height>100 && $0.isHittable}.max{$0.frame.height<$1.frame.height};guard let v else {break};let top=v.coordinate(withNormalizedOffset:CGVector(dx:0.12,dy:0.2)),bottom=v.coordinate(withNormalizedOffset:CGVector(dx:0.12,dy:0.8));(down ? top:bottom).press(forDuration:0.05,thenDragTo:down ? bottom:top)};XCTAssertTrue(e.isHittable,id);e.tap()}
 @MainActor func cap(_ a:XCUIApplication,_ name:String){let dir=URL(fileURLWithPath:"/tmp/sqld040-native/\(UIDevice.current.userInterfaceIdiom == .pad ? "ipad":"iphone")-\(Int(a.frame.width))");try? FileManager.default.createDirectory(at:dir,withIntermediateDirectories:true);try? XCUIScreen.main.screenshot().pngRepresentation.write(to:dir.appendingPathComponent(name+".png"));try? a.debugDescription.write(to:dir.appendingPathComponent(name+".txt"),atomically:true,encoding:.utf8);print("MOCK60-CAPTURE \(dir.path)/\(name)")}
 @MainActor func testVolumeJourneys() throws {
  continueAfterFailure=false;let a=XCUIApplication(bundleIdentifier:"com.sqldpass.app.adsqa");a.launch()
  if el(a,"textbook-start").waitForExistence(timeout:3){tap(a,"textbook-start");tap(a,"save-textbook-settings")}
  tap(a,"tab-exams");cap(a,"01-volume1");tap(a,"mock-volume-vol2");cap(a,"02-volume2");XCTAssertTrue(el(a,"mock-SQLD-M21").exists);XCTAssertFalse(el(a,"mock-SQLD-M01").exists)
  tap(a,"mock-filters");cap(a,"03-filter");tap(a,"exam-filter-completed");tap(a,"mock-filter-close");XCTAssertTrue(el(a,"mock-SQLD-M21").exists)
  tap(a,"mock-filters");tap(a,"mock-filter-available");tap(a,"mock-filter-apply");cap(a,"04-filter-available");tap(a,"mock-filters");tap(a,"mock-filter-reset");tap(a,"mock-filter-apply")
  tap(a,"mock-SQLD-M21");cap(a,"05-volume2-intro");XCTAssertTrue(el(a,"unlock-mock").exists || el(a,"start-mock-timed").exists || el(a,"resume-mock").exists)
  tap(a,"뒤로");tap(a,"mock-volume-vol3");cap(a,"06-volume3");tap(a,"모의고사 출처와 기준");cap(a,"07-volume3-sources");tap(a,"sources-volume-vol2");cap(a,"08-volume2-sources");tap(a,"source-editorial");cap(a,"09-source-editorial")
  tap(a,"tab-records");cap(a,"10-records-all");tap(a,"stats-volume-vol3");cap(a,"11-records-volume3");tap(a,"모의고사 응시 기록 · 모드별 통계");cap(a,"12-history-all");tap(a,"examHistory-volume-vol2");cap(a,"13-history-volume2")
  tap(a,"tab-exams");tap(a,"mock-wrong");tap(a,"mockReview-volume-vol2");cap(a,"14-review-volume2");tap(a,"tab-exams");tap(a,"mock-saved");tap(a,"mockSaved-volume-vol3");cap(a,"15-saved-volume3")
  tap(a,"설정");tap(a,"130%");tap(a,"어둡게");tap(a,"save-textbook-settings");tap(a,"tab-exams");cap(a,"16-dark-large-volume3");tap(a,"mock-filters");cap(a,"17-dark-large-filter");tap(a,"mock-filter-close");tap(a,"설정");tap(a,"100%");tap(a,"밝게");tap(a,"save-textbook-settings")
 }

 @MainActor func testReward21Persistence() throws {
  continueAfterFailure=false;let a=XCUIApplication(bundleIdentifier:"com.sqldpass.app.adsqa");a.launch();tap(a,"tab-exams");tap(a,"mock-volume-vol2");tap(a,"mock-SQLD-M21");
  XCTAssertTrue(el(a,"start-mock-timed").waitForExistence(timeout:15));cap(a,"19-unlocked21-after-restart")
 }
 @MainActor func testReward41() throws {
  continueAfterFailure=false;let a=XCUIApplication(bundleIdentifier:"com.sqldpass.app.adsqa");a.launch();tap(a,"tab-exams");tap(a,"mock-volume-vol3");tap(a,"mock-SQLD-M41");tap(a,"unlock-mock")
  let marker=a.staticTexts.matching(NSPredicate(format:"label == %@ OR label == %@","Test mode","Test Ad")).firstMatch
  XCTAssertTrue(marker.waitForExistence(timeout:25));cap(a,"20-test-reward41");Thread.sleep(forTimeInterval:35)
  // Google test creatives expose either localized native close or the web Close button.
  let close=a.buttons.matching(NSPredicate(format:"label == %@ OR label == %@","Close","Close Advertisement")).firstMatch
  XCTAssertTrue(close.waitForExistence(timeout:15));XCTAssertTrue(close.isHittable);close.tap()
  XCTAssertTrue(el(a,"start-mock-timed").waitForExistence(timeout:15));cap(a,"21-unlocked41")
 }
}
