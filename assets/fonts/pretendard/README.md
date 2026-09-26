# Pretendard 1.3.9

Unmodified static OTF fonts by Kil Hyung-jin, distributed under SIL Open Font License 1.1.

- Official release: https://github.com/orioncactus/pretendard/releases/tag/v1.3.9
- Archive: https://github.com/orioncactus/pretendard/releases/download/v1.3.9/Pretendard-1.3.9.zip
- Original archive entries: `public/static/Pretendard-{Regular,SemiBold,Bold,ExtraBold}.otf`
- License: upstream `LICENSE.txt`, copied verbatim; also accessible in the app under MY → 콘텐츠 버전·상태 → 글꼴 라이선스 전문.
- Source verified in the Codex internal browser on 2026-09-16. Browser download did not expose a local file, so the same official URL was downloaded with PowerShell.

## Integration

`expo-font` embeds these assets at native build time. Android registers the `Pretendard` family at weights 400/600/700/800; iOS reads the same typographic family from the OTF name tables. The regular family covers body text, SemiBold buttons, Bold headings, and ExtraBold scores/brand text. Four files total 6,303,228 bytes before native packaging compression.

`src/platform/Typography.tsx` preserves Text/TextInput props and OS font scaling. Explicit `fontFamily` styles override the default, so SQL remains platform monospace. No device-wide font installation, CDN request, runtime download or font-loading delay is introduced.

Native binaries must be rebuilt to contain the assets. Existing development clients cannot gain embedded fonts through JavaScript reload alone. Font metadata/type checks or browser previews do not establish iPhone/iPad/Android device rendering quality.
