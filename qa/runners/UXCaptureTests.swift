import XCTest
import UIKit

// Run only against the isolated official-test-ad app. Never use the production bundle.
final class CaptureTests: XCTestCase {
 @MainActor func el(_ a: XCUIApplication, _ id: String) -> XCUIElement { let button=a.buttons.matching(identifier:id).firstMatch;return button.exists ? button:a.descendants(matching: .any).matching(identifier: id).firstMatch }
 @MainActor func tap(_ a: XCUIApplication, _ id: String) {
  let e=el(a,id); XCTAssertTrue(e.waitForExistence(timeout: 12),id)
  for _ in 0..<18 { if e.isHittable {break}; scroll(a,down:e.frame.minY < a.frame.minY+120) }
  XCTAssertTrue(e.isHittable,id); e.tap()
 }
 @MainActor func scroll(_ a:XCUIApplication,down:Bool=false){
  let v=a.scrollViews.allElementsBoundByIndex.filter{$0.frame.height>80 && $0.frame.minY>=0 && $0.frame.maxY<=a.frame.maxY && $0.isHittable}.max{$0.frame.height<$1.frame.height}!;let dx=max(12,(v.frame.width-720)/2+12)/v.frame.width;let top=v.coordinate(withNormalizedOffset:CGVector(dx:dx,dy:0.2)),bottom=v.coordinate(withNormalizedOffset:CGVector(dx:dx,dy:0.8));(down ? top:bottom).press(forDuration:0.05,thenDragTo:down ? bottom:top)
 }
 @MainActor func prefix(_ a:XCUIApplication,_ label:String) {
  let e=a.buttons.matching(NSPredicate(format:"label BEGINSWITH %@",label)).firstMatch
  XCTAssertTrue(e.waitForExistence(timeout:12),label)
  for _ in 0..<18 {if e.isHittable {break};scroll(a,down:e.frame.minY < 120)}
  e.tap()
 }
 @MainActor func cap(_ a:XCUIApplication,_ name:String) {
  let dir=URL(fileURLWithPath:"/tmp/sqld-034-native/\(UIDevice.current.userInterfaceIdiom == .pad ? "ipad" : "iphone")-\(Int(a.frame.width))")
  try? FileManager.default.createDirectory(at:dir,withIntermediateDirectories:true)
  try? XCUIScreen.main.screenshot().pngRepresentation.write(to:dir.appendingPathComponent(name+".png"))
  try? a.debugDescription.write(to:dir.appendingPathComponent(name+".txt"),atomically:true,encoding:.utf8)
  print("UX-CAPTURE \(dir.lastPathComponent)/\(name)")
 }
 @MainActor func timeLabel(_ a:XCUIApplication)->String {
  a.staticTexts.matching(NSPredicate(format:"label MATCHES %@","[0-9]{2}:[0-9]{2}:[0-9]{2}")).firstMatch.label
 }
 @MainActor func testLearningJourneys() throws {
  continueAfterFailure=false
  let a=XCUIApplication(bundleIdentifier:"com.sqldpass.app.adsqa"); a.launch()
  if el(a,"textbook-start").waitForExistence(timeout:3) {cap(a,"welcome");tap(a,"textbook-start");cap(a,"setup");tap(a,"save-textbook-settings")}
  tap(a,"tab-today");tap(a,"설정");tap(a,"밝게");tap(a,"100%");if el(a,"save-textbook-settings").isEnabled {tap(a,"save-textbook-settings")} else {tap(a,"뒤로")};cap(a,"home")
  tap(a,"tab-learn");cap(a,"textbook");tap(a,"chapter-1");cap(a,"chapter");tap(a,"section-TB20261109:c1-s5");cap(a,"lesson-sql")
  tap(a,"SQL 자동 줄바꿈");a.swipeUp();cap(a,"lesson-lower");tap(a,"mark-section")
  tap(a,"tab-exams")
  if el(a,"resume-mock").exists {tap(a,"resume-mock");if el(a,"leave-exam").exists {tap(a,"leave-exam")};tap(a,"pause-submit");tap(a,"제출하고 결과 보기");tap(a,"tab-exams")}
  cap(a,"mock-catalog");tap(a,"mock-SQLD-M01");cap(a,"mock-intro");tap(a,"start-mock-timed");cap(a,"exam-question")
  tap(a,"mock-option-2");tap(a,"mock-next");tap(a,"mock-option-2");tap(a,"flag-mock")
  tap(a,"mock-sheet");tap(a,"sheet-filter-unanswered");cap(a,"answer-sheet-unanswered");XCTAssertFalse(el(a,"mock-sheet-1").exists)
  tap(a,"submit-mock");cap(a,"submit-while-solving");tap(a,"취소");tap(a,"sheet-filter-all");tap(a,"mock-sheet-50");cap(a,"exam-last")
  tap(a,"leave-exam");cap(a,"paused");let frozen=timeLabel(a);XCTAssertFalse(el(a,"mock-option-1").exists)
  a.terminate();a.launch();tap(a,"tab-today");cap(a,"paused-home");XCTAssertFalse(el(a,"small-ad-slot").exists)
  tap(a,"resume-mock");XCTAssertEqual(timeLabel(a),frozen);tap(a,"resume-paused-mock")
  XCUIDevice.shared.press(.home);a.activate();XCTAssertTrue(el(a,"resume-paused-mock").waitForExistence(timeout:12));cap(a,"background-pause")
  tap(a,"pause-submit");cap(a,"submit-confirm");tap(a,"취소");XCTAssertTrue(el(a,"resume-paused-mock").exists)
  tap(a,"pause-submit");tap(a,"제출하고 결과 보기");cap(a,"exam-result")
  XCTAssertTrue(a.staticTexts.matching(NSPredicate(format:"label CONTAINS %@","정답 1 · 오답 1 · 미응답 48")).firstMatch.exists)
  tap(a,"review-wrong");cap(a,"review-wrong");tap(a,"mock-review-next");cap(a,"review-unanswered")
  tap(a,"mock-theory");cap(a,"review-related-textbook");tap(a,"뒤로");XCTAssertTrue(el(a,"mock-review-next").exists)
  tap(a,"review-picker");cap(a,"review-picker");tap(a,"review-jump-50");cap(a,"review-last")
  tap(a,"save-mock-question");tap(a,"toggle-mock-note");let note=el(a,"mock-note");note.tap();note.typeText("Check the condition before choosing.");cap(a,"review-note-keyboard");tap(a,"save-mock-note")
  tap(a,"tab-exams");tap(a,"mock-saved");cap(a,"saved-mock");tap(a,"tab-exams");tap(a,"mock-history");cap(a,"exam-history")
  tap(a,"tab-review");tap(a,"batch-5");cap(a,"practice-list");prefix(a,"종합 연습");if el(a,"새 연습 시작").waitForExistence(timeout:2){tap(a,"새 연습 시작")}
  for i in 0..<5 {tap(a,"option-2");if i==0{cap(a,"practice-selected")};tap(a,"submit-question");if i==0{cap(a,"practice-feedback")};tap(a,"next-question")}
  cap(a,"practice-result");tap(a,"tab-records");cap(a,"records");tap(a,"설정");tap(a,"130%");tap(a,"tab-today");cap(a,"unsaved-settings");tap(a,"계속 설정");tap(a,"어둡게");tap(a,"save-textbook-settings");tap(a,"tab-today");cap(a,"home-dark-large")
  XCTAssertLessThanOrEqual(el(a,"tab-records").frame.maxY,a.frame.maxY)
  tap(a,"tab-exams");tap(a,"mock-SQLD-M02");tap(a,"mode-study");tap(a,"start-mock-study");cap(a,"study-dark-large");tap(a,"leave-exam");cap(a,"paused-dark-large");tap(a,"pause-submit");tap(a,"제출하고 결과 보기")
  tap(a,"설정");tap(a,"밝게");tap(a,"100%");tap(a,"save-textbook-settings");tap(a,"설정");tap(a,"개인정보 안내");cap(a,"privacy");tap(a,"뒤로");tap(a,"도움말과 출처");tap(a,"faq-0");cap(a,"help")
 }
 @MainActor func testAuxiliaryJourneys() throws {
  continueAfterFailure=false
  let a=XCUIApplication(bundleIdentifier:"com.sqldpass.app.adsqa");a.launch();tap(a,"tab-today")
  tap(a,"핵심 카드");tap(a,"flip-card");cap(a,"flashcard-answer");tap(a,"known-card");tap(a,"known-card");tap(a,"다음 카드");tap(a,"이전 카드");tap(a,"cards-unknown");cap(a,"flashcard-filter")
  tap(a,"tab-today");tap(a,"용어 사전");cap(a,"glossary");let term=el(a,"용어 검색");term.tap();term.typeText("NULL");cap(a,"glossary-search");tap(a,"clear-glossary-search");tap(a,"tab-learn")
  let search=el(a,"교재 검색");search.tap();search.typeText("zzzxxyy");cap(a,"search-empty");tap(a,"clear-textbook-search");tap(a,"bookmarked-sections");cap(a,"bookmarks-filter");tap(a,"bookmarked-sections");tap(a,"chapter-1");tap(a,"section-TB20261109:c1-s1");cap(a,"lesson-widget");tap(a,"tab-records");tap(a,"설정");tap(a,"학습 알림");cap(a,"reminders");tap(a,"뒤로");tap(a,"데이터 관리");cap(a,"data-management");tap(a,"학습 기록만 초기화");cap(a,"reset-confirm");tap(a,"취소");tap(a,"전체 데이터 삭제");cap(a,"delete-confirm");tap(a,"취소");tap(a,"tab-exams");tap(a,"mock-wrong");cap(a,"mock-review-list");tap(a,"tab-exams");tap(a,"mock-saved");cap(a,"mock-saved-list")
 }

 @MainActor func testLargeTextJourney() throws {
  continueAfterFailure=false;let a=XCUIApplication(bundleIdentifier:"com.sqldpass.app.adsqa");a.launch();tap(a,"tab-today");cap(a,"system-largest-home");tap(a,"tab-exams");tap(a,"mock-SQLD-M03");tap(a,"mode-study");tap(a,"start-mock-study");cap(a,"system-largest-question");tap(a,"mock-option-2");cap(a,"system-largest-selected");tap(a,"leave-exam");cap(a,"system-largest-pause");tap(a,"pause-submit");cap(a,"system-largest-submit");tap(a,"제출하고 결과 보기");cap(a,"system-largest-result")
 }
 @MainActor func testTabletLandscape() throws {
  continueAfterFailure=false;let a=XCUIApplication(bundleIdentifier:"com.sqldpass.app.adsqa");a.launch();XCUIDevice.shared.orientation = .landscapeLeft;tap(a,"tab-learn");tap(a,"chapter-1");tap(a,"section-TB20261109:c1-s5");cap(a,"landscape-lesson");tap(a,"tab-exams");tap(a,"mock-SQLD-M03");tap(a,"start-mock-timed");cap(a,"landscape-question");tap(a,"leave-exam");cap(a,"landscape-pause");tap(a,"pause-submit");tap(a,"제출하고 결과 보기");XCUIDevice.shared.orientation = .portrait
 }


 @MainActor func testFinalDateControls() throws {
  continueAfterFailure=false;let a=XCUIApplication(bundleIdentifier:"com.sqldpass.app.adsqa");a.launch();tap(a,"tab-today");tap(a,"설정");prefix(a,"목표 시험일,");tap(a,"시험일 선택 완료");cap(a,"final-date-single-clear");XCTAssertEqual(a.buttons.matching(identifier:"시험일 비우기").count,1);XCTAssertFalse(el(a,"목표일 지우기").exists);tap(a,"시험일 비우기");XCTAssertFalse(el(a,"시험일 비우기").exists);cap(a,"final-date-cleared");tap(a,"tab-today")
 }
}
