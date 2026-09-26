"""Static ELF/ZIP 16 KB checks; this does not replace a 16 KB device run."""
import hashlib, json, struct, sys, zipfile
from pathlib import Path

apk = Path(sys.argv[1]).resolve()
report = {'artifact': apk.name, 'sha256': hashlib.sha256(apk.read_bytes()).hexdigest(),
          'scope': 'Static APK and 64-bit ELF alignment only; not device execution', 'libraries': [], 'failures': []}
with apk.open('rb') as raw, zipfile.ZipFile(apk) as archive:
    for entry in archive.infolist():
        if not entry.filename.startswith(('lib/arm64-v8a/', 'lib/x86_64/')) or not entry.filename.endswith('.so'):
            continue
        data = archive.read(entry)
        if data[:5] != b'\x7fELF\x02' or data[5] != 1:
            report['failures'].append(entry.filename + ': unsupported ELF'); continue
        offset = struct.unpack_from('<Q', data, 32)[0]
        size, count = struct.unpack_from('<HH', data, 54)
        alignments = []
        for i in range(count):
            head = offset + i * size
            if struct.unpack_from('<I', data, head)[0] == 1:
                file_offset, address = struct.unpack_from('<QQ', data, head + 8)
                align = struct.unpack_from('<Q', data, head + 48)[0]
                alignments.append(align)
                if align < 16384 or (file_offset-address) % 16384:
                    report['failures'].append(entry.filename + ': PT_LOAD is not 16 KB aligned')
        if not alignments: report['failures'].append(entry.filename + ': no load segments')
        raw.seek(entry.header_offset + 26)
        name_length, extra_length = struct.unpack('<HH', raw.read(4))
        zip_offset = entry.header_offset + 30 + name_length + extra_length
        if entry.compress_type == zipfile.ZIP_STORED and zip_offset % 16384:
            report['failures'].append(entry.filename + ': uncompressed ZIP entry is not 16 KB aligned')
        report['libraries'].append({'path': entry.filename, 'loadAlignments': alignments, 'zipOffset': zip_offset, 'compressed': entry.compress_type != zipfile.ZIP_STORED})
if not report['libraries']: report['failures'].append('No 64-bit native libraries found')
target = apk.with_suffix('.alignment.json')
target.write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps({'artifact': apk.name, 'libraries': len(report['libraries']), 'failures': report['failures'], 'report': str(target)}))
sys.exit(bool(report['failures']))
