import XCTest
import UIKit

// Uses the separate official-test-ad app; never seeds learner data or reward grants.
final class CaptureTests: XCTestCase {
 @MainActor func el(_ a:XCUIApplication,_ id:String)->XCUIElement {let b=a.buttons.matching(identifier:id).firstMatch;return b.exists ? b:a.descendants(matching:.any).matching(identifier:id).firstMatch}
 @MainActor func tap(_ a:XCUIApplication,_ id:String){let e=el(a,id);XCTAssertTrue(e.waitForExistence(timeout:12),id);for _ in 0..<24 {if e.isHittable{break};let down=e.frame.minY<120;let v=a.scrollViews.allElementsBoundByIndex.filter{$0.frame.height>100 && $0.isHittable}.max{$0.frame.height<$1.frame.height};guard let v else {break};let top=v.coordinate(withNormalizedOffset:CGVector(dx:0.35,dy:0.2)),bottom=v.coordinate(withNormalizedOffset:CGVector(dx:0.35,dy:0.8));(down ? top:bottom).press(forDuration:0.05,thenDragTo:down ? bottom:top)};XCTAssertTrue(e.isHittable,id);e.tap()}
 @MainActor func cap(_ a:XCUIApplication,_ name:String){let dir=URL(fileURLWithPath:"/tmp/sqld050-native/\(UIDevice.current.userInterfaceIdiom == .pad ? "ipad":"iphone")-\(Int(a.frame.width))");try? FileManager.default.createDirectory(at:dir,withIntermediateDirectories:true);try? XCUIScreen.main.screenshot().pngRepresentation.write(to:dir.appendingPathComponent(name+".png"));try? a.debugDescription.write(to:dir.appendingPathComponent(name+".txt"),atomically:true,encoding:.utf8);print("MOCK40-CAPTURE \(dir.path)/\(name)")}
 @MainActor func launch(_ dismissNotice:Bool=true)->XCUIApplication {let a=XCUIApplication(bundleIdentifier:"com.sqldpass.app.adsqa");a.launch();if el(a,"textbook-start").waitForExistence(timeout:3){tap(a,"textbook-start");tap(a,"save-textbook-settings")};if dismissNotice && el(a,"dismiss-mock-migration").exists{tap(a,"dismiss-mock-migration")};return a}
 @MainActor func testUpgrade() throws {
  continueAfterFailure=false;let a=launch(false);tap(a,"tab-today");cap(a,"01-upgrade-notice");tap(a,"dismiss-mock-migration");tap(a,"resume-mock");XCTAssertTrue(el(a,"resume-paused-mock").exists);cap(a,"02-upgrade-paused");tap(a,"resume-paused-mock");XCTAssertTrue(a.staticTexts["제01회 · 학습"].exists);cap(a,"03-upgrade-restored-answer");tap(a,"leave-exam");a.terminate()
 }
 @MainActor func testJourneys() throws {
  continueAfterFailure=false;let a=launch();tap(a,"tab-exams");
  if el(a,"resume-mock").exists {tap(a,"resume-mock");if el(a,"leave-exam").exists{tap(a,"leave-exam")};tap(a,"pause-submit");tap(a,"제출하고 결과 보기");tap(a,"tab-exams")}
  tap(a,"mock-volume-vol2");cap(a,"04-volume1");XCTAssertTrue(el(a,"mock-SQLD-M21").exists);XCTAssertFalse(el(a,"mock-SQLD-M01").exists);tap(a,"mock-filters");cap(a,"05-filter");tap(a,"mock-filter-available");tap(a,"mock-filter-apply");cap(a,"06-available");tap(a,"mock-filters");tap(a,"mock-filter-reset");tap(a,"mock-filter-apply")
  tap(a,"mock-volume-vol3");cap(a,"07-volume2");tap(a,"mock-SQLD-M41");cap(a,"08-free21-intro");XCTAssertFalse(el(a,"unlock-mock").exists);tap(a,"mode-study");tap(a,"start-mock-study");tap(a,"mock-option-2");tap(a,"flag-mock");cap(a,"09-question-selected");tap(a,"mock-next");tap(a,"mock-option-1");tap(a,"mock-sheet");tap(a,"sheet-filter-unanswered");cap(a,"10-sheet-unanswered");XCTAssertFalse(el(a,"mock-sheet-1").exists);tap(a,"submit-mock");tap(a,"취소");tap(a,"sheet-filter-all");tap(a,"mock-sheet-50");cap(a,"11-question50");tap(a,"leave-exam");cap(a,"12-paused");tap(a,"pause-submit");tap(a,"제출하고 결과 보기");cap(a,"13-result");tap(a,"review-all");cap(a,"14-review-question-visible");XCTAssertFalse(el(a,"show-original-question").exists);XCTAssertTrue(el(a,"explanation-option-1").exists);tap(a,"mock-review-next");cap(a,"15-review-next");tap(a,"review-picker");tap(a,"review-jump-50");cap(a,"16-review50");tap(a,"save-mock-question");tap(a,"result-summary");tap(a,"result-exam-list");cap(a,"17-return-volume2")
  tap(a,"tab-records");cap(a,"18-records");tap(a,"stats-volume-vol3");cap(a,"19-records-volume2");tap(a,"tab-exams");tap(a,"mock-saved");tap(a,"mockSaved-volume-vol3");cap(a,"20-saved");tap(a,"tab-review");cap(a,"21-practice");tap(a,"batch-5");cap(a,"22-practice5");tap(a,"설정");tap(a,"130%");tap(a,"어둡게");tap(a,"save-textbook-settings");tap(a,"tab-review");cap(a,"23-dark-large-practice");tap(a,"tab-exams");cap(a,"24-dark-large-volumes");tap(a,"mock-filters");cap(a,"25-dark-large-filter");tap(a,"mock-filter-close");tap(a,"설정");tap(a,"100%");tap(a,"밝게");tap(a,"save-textbook-settings")
 }
 @MainActor func testReward6() throws {
  continueAfterFailure=false;let a=launch();tap(a,"tab-exams");tap(a,"mock-volume-vol2");tap(a,"mock-SQLD-M26");tap(a,"unlock-mock")
  let marker=a.staticTexts.matching(NSPredicate(format:"label == %@ OR label == %@","Test mode","Test Ad")).firstMatch
  XCTAssertTrue(marker.waitForExistence(timeout:25));cap(a,"26-test-reward6");Thread.sleep(forTimeInterval:35)
  let close=a.buttons.matching(identifier:"Close").firstMatch
  XCTAssertTrue(close.waitForExistence(timeout:15));XCTAssertTrue(close.isHittable);close.tap();XCTAssertTrue(el(a,"start-mock-timed").waitForExistence(timeout:15));cap(a,"27-unlocked6")
  a.terminate();a.launch();tap(a,"tab-exams");tap(a,"mock-volume-vol2");tap(a,"mock-SQLD-M26");XCTAssertTrue(el(a,"start-mock-timed").exists);cap(a,"28-unlocked6-restart")
 }
 @MainActor func testFinishExistingReward6() throws {
 continueAfterFailure=false;let a=XCUIApplication(bundleIdentifier:"com.sqldpass.app.adsqa");a.activate();let close=a.buttons.matching(identifier:"Close").firstMatch;XCTAssertTrue(close.waitForExistence(timeout:15));XCTAssertTrue(close.isEnabled);close.tap();XCTAssertTrue(el(a,"start-mock-timed").waitForExistence(timeout:15));cap(a,"27-unlocked6");a.terminate();a.launch();tap(a,"tab-exams");tap(a,"mock-volume-vol2");tap(a,"mock-SQLD-M26");XCTAssertTrue(el(a,"start-mock-timed").exists);cap(a,"28-unlocked6-restart")
 }
}