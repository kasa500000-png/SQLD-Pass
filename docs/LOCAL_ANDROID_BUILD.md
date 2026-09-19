# 로컬 Android 내부 검증 빌드

광고 off 설치 파일을 만드는 PowerShell 절차입니다. 서명된 스토어 AAB가 아닙니다.

React Native 0.86 Gradle 번들 작업은 JS/TS 입력을 추적하지만 가져온 JSON은 입력 목록에 없습니다.
`config/public-support.json`만 변경하면 예전 번들을 재사용할 수 있으므로 아래처럼 생성 번들을 제거한 뒤 빌드합니다.
이 제거 대상은 생성된 단일 파일이며 학습 콘텐츠나 사용자 데이터를 삭제하지 않습니다.

```powershell
# D:\SQLD-Pass에서 실행
$env:NODE_ENV = 'production'
$env:EXPO_PUBLIC_APP_ENV = 'internal'
$env:EXPO_PUBLIC_ADS_MODE = 'off'
node scripts/build-guard.cjs
if ($LASTEXITCODE -ne 0) { throw 'Build guard failed' }
$bundlePath = Join-Path (Get-Location) 'android/app/build/generated/assets/react/release/index.android.bundle'
if (Test-Path -LiteralPath $bundlePath) { Remove-Item -LiteralPath $bundlePath }
Push-Location android
try {
  .\gradlew.bat :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64' --max-workers=2 --no-daemon --console=plain
  if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
} finally { Pop-Location }
Copy-Item -LiteralPath android/app/build/outputs/apk/release/app-release.apk -Destination .build/artifacts/SQLD-Pass-internal-off.apk -Force
Get-FileHash .build/artifacts/SQLD-Pass-internal-off.apk -Algorithm SHA256
```

로그에서 `createBundleReleaseJsAndAssets` 실행 여부와 설정 변경 후 APK 해시 변경을 확인합니다.
설치 후 실제 고객센터/개인정보 화면의 연결 버튼을 확인합니다. HTTP 응답 검증은 네이티브 링크 실행 검증과 별도로 기록합니다.

