"""Check the actual distribution, not a development symlink."""
import json
import sys
import zipfile
from pathlib import Path
with zipfile.ZipFile(sys.argv[1]) as archive:
    names = archive.namelist()
    for prefix in ['vendor/', 'node_modules/', '.agents/', 'tests/', 'docs/', 'build/', '.env']:
        assert not any(name.startswith(prefix) for name in names), prefix
    assert not {'skills-lock.json', 'rector.php', 'composer.lock'} & set(names)
    required = ['composer.json', 'src/FilamentDaisyUiThemesPlugin.php',
                'resources/dist/themes.css', 'resources/dist/adapter.css',
                'resources/dist/theme-data.json', 'resources/dist/filament-daisy-ui-themes.js',
                'resources/dist/DAISYUI-LICENSE.txt', 'resources/views/switcher.blade.php']
    for name in required:
        assert archive.read(name) == Path(name).read_bytes(), name
    # Every built-in theme ships its own stylesheet so panels can inline a subset.
    manifest = json.loads(archive.read('resources/dist/theme-data.json'))
    assert manifest['themes'], 'manifest has no themes'
    for theme in manifest['themes']:
        name = f'resources/dist/themes/{theme}.css'
        assert name in names, f'missing {name}'
        assert archive.read(name) == Path(name).read_bytes(), name
    # Only themes that passed the acceptance matrix may be advertised as verified.
    assert set(manifest.get('verified', [])) <= set(manifest['themes']), 'verified list is not a subset of themes'
    assert set(manifest.get('audited', [])) <= set(manifest['themes']), 'audited list is not a subset of themes'
    assert json.loads(archive.read('composer.json'))['require']['filament/filament'] == '^4.0 || ^5.0'
print(f'Distribution verified: {len(names)} files')
