import XCTest
import UIKit

// Uses the separate official-test-ad app; never seeds learner data or reward grants.
final class CaptureTests: XCTestCase {
 @MainActor func el(_ a:XCUIApplication,_ id:String)->XCUIElement {let b=a.buttons.matching(identifier:id).firstMatch;return b.exists ? b:a.descendants(matching:.any).matching(identifier:id).firstMatch}
 @MainActor func tap(_ a:XCUIApplication,_ id:String){let e=el(a,id);XCTAssertTrue(e.waitForExistence(timeout:12),id);for _ in 0..<24 {if e.isHittable{break};let down=e.frame.minY<120;let v=a.scrollViews.allElementsBoundByIndex.filter{$0.frame.height>100 && $0.isHittable}.max{$0.frame.height<$1.frame.height};guard let v else {break};let top=v.coordinate(withNormalizedOffset:CGVector(dx:0.35,dy:0.2)),bottom=v.coordinate(withNormalizedOffset:CGVector(dx:0.35,dy:0.8));(down ? top:bottom).press(forDuration:0.05,thenDragTo:down ? bottom:top)};XCTAssertTrue(e.isHittable,id);e.tap()}
 @MainActor func cap(_ a:XCUIApplication,_ name:String){let dir=URL(fileURLWithPath:"/tmp/sqld070-native/\(UIDevice.current.userInterfaceIdiom == .pad ? "ipad":"iphone")-\(Int(a.frame.width))");try? FileManager.default.createDirectory(at:dir,withIntermediateDirectories:true);try? XCUIScreen.main.screenshot().pngRepresentation.write(to:dir.appendingPathComponent(name+".png"));try? a.debugDescription.write(to:dir.appendingPathComponent(name+".txt"),atomically:true,encoding:.utf8);print("NOTES-CAPTURE \(dir.path)/\(name)")}
 @MainActor func launch(_ dismissNotice:Bool=true)->XCUIApplication {let a=XCUIApplication(bundleIdentifier:"com.sqldpass.app.adsqa");a.launch();if el(a,"textbook-start").waitForExistence(timeout:3){tap(a,"textbook-start");tap(a,"save-textbook-settings")};if dismissNotice && el(a,"dismiss-mock-migration").exists{tap(a,"dismiss-mock-migration")};return a}
 @MainActor func testNotes070() throws {
 continueAfterFailure=false;let a=launch()
 for tab in ["tab-today","tab-learn","tab-review","tab-exams","tab-records"] {tap(a,tab);XCTAssertTrue(el(a,"open-memory-notes").isHittable)}
 tap(a,"tab-today");cap(a,"01-home");tap(a,"open-memory-notes");cap(a,"02-index");tap(a,"memory-category-functions");cap(a,"03-reader")
 for _ in 0..<3 {a.scrollViews.firstMatch.swipeUp()};XCTAssertTrue(el(a,"screen-back").isHittable);cap(a,"04-reader-scrolled");el(a,"screen-back").tap()
 let search=a.textFields.matching(identifier:"memory-search").firstMatch;XCTAssertTrue(search.waitForExistence(timeout:8));search.tap();search.typeText("NVL")
 tap(a,"memory-match-functions-19");XCTAssertTrue(el(a,"memory-save-functions-19").isHittable);cap(a,"05-search-anchor")
 if el(a,"memory-save-functions-19").label.contains("저장 해제")==false {tap(a,"memory-save-functions-19")}
 tap(a,"screen-back");tap(a,"clear-memory-search");tap(a,"memory-filter-saved");XCTAssertTrue(el(a,"memory-match-functions-19").exists);cap(a,"06-saved");tap(a,"screen-back")
 a.terminate();a.launch();tap(a,"open-memory-notes");tap(a,"memory-continue");cap(a,"07-resumed");XCTAssertTrue(el(a,"memory-save-functions-19").isHittable);tap(a,"screen-back");tap(a,"screen-back")
 tap(a,"설정");tap(a,"130%");tap(a,"어둡게");tap(a,"save-textbook-settings");tap(a,"tab-today");cap(a,"08-dark-large-header");tap(a,"open-memory-notes");cap(a,"09-dark-large-index");tap(a,"memory-category-functions");cap(a,"10-dark-large-reader");tap(a,"screen-back");tap(a,"screen-back");tap(a,"설정");tap(a,"100%");tap(a,"밝게");tap(a,"save-textbook-settings")
 }
 @MainActor func testReview070() throws {
 continueAfterFailure=false;let a=launch();tap(a,"tab-exams");tap(a,"mock-volume-vol2");tap(a,"mock-SQLD-M21");tap(a,"mode-study");tap(a,"start-mock-study");tap(a,"mock-option-1");tap(a,"mock-option-2");tap(a,"mock-sheet");tap(a,"mock-sheet-50");tap(a,"leave-exam");tap(a,"pause-submit");tap(a,"제출하고 결과 보기");tap(a,"review-all");tap(a,"review-picker");tap(a,"review-jump-50");cap(a,"11-review50")
 for _ in 0..<7 {a.scrollViews.firstMatch.swipeUp()};cap(a,"12-review-bottom");let back=el(a,"result-summary");XCTAssertTrue(back.isHittable);XCTAssertLessThan(back.frame.maxY,a.frame.height/2);back.tap();XCTAssertTrue(el(a,"review-all").waitForExistence(timeout:8));cap(a,"13-result-return")
 }
 @MainActor func testLarge070() throws {continueAfterFailure=false;let a=launch();tap(a,"tab-today");XCTAssertTrue(el(a,"open-memory-notes").isHittable);cap(a,"14-system-large-home");tap(a,"open-memory-notes");tap(a,"memory-category-model");cap(a,"15-system-large-reader");a.scrollViews.firstMatch.swipeUp();XCTAssertTrue(el(a,"screen-back").isHittable);el(a,"screen-back").tap();XCTAssertTrue(el(a,"memory-search").exists)}

}
