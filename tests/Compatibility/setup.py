"""Build disposable host apps OUTSIDE this package. Python 3, Composer, PHP, npm required."""

import argparse
import base64
import json
import os
from pathlib import Path
import shlex
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("directory", type=Path)
parser.add_argument("--composer", default="composer", help="e.g. 'php /tmp/composer.phar'")
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
fixtures = args.directory.resolve()
if fixtures == root or root in fixtures.parents:
    raise SystemExit("Fixture applications must live outside the package repository.")
fixtures.mkdir(parents=True, exist_ok=True)
composer = shlex.split(args.composer)


def run(command, cwd):
    subprocess.run(command, cwd=cwd, check=True)


package = {
    "private": True, "type": "module",
    "devDependencies": {
        "daisyui": "5.7.46", "tailwindcss": "4.1.18",
        "@tailwindcss/cli": "4.1.18", "playwright": "1.58.2",
    },
}
(fixtures / "package.json").write_text(json.dumps(package, indent=2) + "\n")
run(["npm", "install"], fixtures)

for major, filament, livewire in [(4, "4.14.0", "3.8.9"), (5, "5.9.0", "4.4.6")]:
    app = fixtures / f"filament{major}"
    if not app.exists():
        run(composer + ["create-project", "laravel/laravel", str(app), "12.12.2", "--no-install", "--no-scripts", "--no-interaction"], fixtures)
    elif not (app / "composer.json").exists() or json.loads((app / "composer.json").read_text()).get("name") != f"compatibility/filament{major}":
        raise SystemExit(f"Refusing to overwrite an unrelated application: {app}")

    repositories = [{"type": "path", "url": str(root), "options": {"symlink": True}}]

    manifest = {
        "name": f"compatibility/filament{major}", "type": "project",
        "require": {"php": "^8.2", "laravel/framework": "12.69.2", "filament/filament": filament,
                    "livewire/livewire": livewire, "osamanagi/filament-daisy-ui-themes": "@dev"},
        "repositories": repositories,
        "autoload": {"psr-4": {"App\\": "app/", "Compatibility\\": str(root / "tests/Compatibility") + "/"}},
        "scripts": {"post-autoload-dump": ["Illuminate\\Foundation\\ComposerScripts::postAutoloadDump", "@php artisan package:discover --ansi"]},
        "minimum-stability": "dev", "prefer-stable": True,
    }
    (app / "composer.json").write_text(json.dumps(manifest, indent=4) + "\n")
    key = base64.b64encode(os.urandom(32)).decode()
    if not (app / ".env").exists() or "APP_KEY=\n" in (app / ".env").read_text():
        (app / ".env").write_text(f'APP_NAME="Compatibility {major}"\nAPP_ENV=local\nAPP_DEBUG=true\nAPP_KEY=base64:{key}\nAPP_URL=http://127.0.0.1:810{major}\nDB_CONNECTION=sqlite\nSESSION_DRIVER=file\nSESSION_COOKIE=filament{major}_compatibility\nCACHE_STORE=file\nQUEUE_CONNECTION=sync\n')
    (app / "database/database.sqlite").touch(exist_ok=True)
    # Delay registering the probe until generated palettes exist.
    (app / "bootstrap/providers.php").write_text("<?php\nreturn [App\\Providers\\AppServiceProvider::class];\n")
    (app / "routes/web.php").write_text('<?php\nuse Illuminate\\Support\\Facades\\Route;\nRoute::redirect("/", "/cupcake");\n')
    run(composer + ["update", "--no-interaction"], app)
    run(["php", "artisan", "migrate", "--force"], app)
    run(["php", str(root / "tests/Compatibility/seed.php")], app)

run(["node", str(root / "tests/Compatibility/build.mjs"), str(fixtures)], root)
for major in [4, 5]:
    app = fixtures / f"filament{major}"
    (app / "bootstrap/providers.php").write_text("<?php\nreturn [App\\Providers\\AppServiceProvider::class, Compatibility\\FixtureProvider::class];\n")
    run(["php", "artisan", "filament:assets"], app)
print(f"Fixtures ready at {fixtures}. See tests/Compatibility/README.md for browser commands.")
