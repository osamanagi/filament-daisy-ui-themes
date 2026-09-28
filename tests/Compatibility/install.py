"""Install two clean consuming apps using Composer and filament:assets only (no npm)."""
import argparse
import base64
import json
import os
from pathlib import Path
import shlex
import subprocess
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('directory', type=Path)
parser.add_argument('--composer', default='composer')
parser.add_argument('--archive', type=Path)
parser.add_argument('--laravel', default='12.69.2')
parser.add_argument('--latest', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
apps = args.directory.resolve()
if apps == root or root in apps.parents or apps.exists():
    raise SystemExit('Choose a NEW directory outside the package repository.')
apps.mkdir(parents=True)
composer = shlex.split(args.composer)
def run(command, cwd):
    subprocess.run(command, cwd=cwd, check=True)
for major, livewire in [(4,'3.8.9'),(5,'4.4.6')]:
    app = apps / f'filament{major}'
    run(composer + ['create-project','laravel/laravel',str(app),'12.12.2','--no-install','--no-scripts','--no-interaction'],apps)
    manifest = {
        'name': f'compatibility/clean-filament{major}', 'type':'project',
        'require': {'php':'^8.2','laravel/framework':args.laravel,'filament/filament':'4.14.0' if major == 4 else '5.9.0','livewire/livewire':livewire,'nagi/filament-daisy-ui-themes':'@dev'},
        'repositories':[{'type':'path','url':str(root),'options':{'symlink':True}}],
        'autoload':{'psr-4':{'App\\':'app/','Compatibility\\':str(root/'tests/Compatibility')+'/'}},
        'scripts':{'post-autoload-dump':['Illuminate\\Foundation\\ComposerScripts::postAutoloadDump','@php artisan package:discover --ansi']},
        'minimum-stability':'dev','prefer-stable':True,
    }
    if args.latest:
        manifest['require']['filament/filament'] = '^4.14' if major == 4 else '^5.9'
        manifest['require']['livewire/livewire'] = '^' + livewire
    if args.archive:
        with zipfile.ZipFile(args.archive) as archive:
            metadata = json.loads(archive.read('composer.json'))
        metadata.update(version='dev-compatibility', dist={'type':'zip','url':args.archive.resolve().as_uri()})
        manifest['repositories'] = [{'type':'package','package':metadata}]
    (app/'composer.json').write_text(json.dumps(manifest,indent=4)+'\n')
    key = base64.b64encode(os.urandom(32)).decode()
    (app/'.env').write_text(f'APP_NAME="Clean compatibility {major}"\nAPP_ENV=local\nAPP_DEBUG=true\nAPP_KEY=base64:{key}\nAPP_URL=http://127.0.0.1:810{major}\nDB_CONNECTION=sqlite\nSESSION_DRIVER=file\nSESSION_COOKIE=filament{major}_clean\nCACHE_STORE=database\nQUEUE_CONNECTION=sync\n')
    (app/'database/database.sqlite').touch()
    (app/'bootstrap/providers.php').write_text('<?php\nreturn [App\\Providers\\AppServiceProvider::class, Compatibility\\FixtureProvider::class];\n')
    (app/'routes/web.php').write_text('<?php\n')
    run(composer+['update','--no-interaction'],app)
    run(['php','artisan','migrate','--force'],app)
    run(['php',str(root/'tests/Compatibility/seed.php')],app)
    run(['php','artisan','filament:assets'],app)
    assert not (app/'node_modules').exists()
    assert not (app/'public/compatibility').exists()
print(f'Clean apps installed at {apps}; no npm dependencies, copied plugin assets, or metadata overrides.')
