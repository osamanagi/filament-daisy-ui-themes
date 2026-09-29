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
    assert json.loads(archive.read('composer.json'))['require']['filament/filament'] == '^4.14 || ^5.9'
print(f'Distribution verified: {len(names)} files')
