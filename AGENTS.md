# Repository Guidelines

## Project Structure & Module Organization

This Laravel package integrates daisyUI themes with Filament 4 and 5 and declares PHP `^8.2` support.

- `src/` contains the plugin, service provider, and facade under `Nagi\FilamentDaisyUiThemes`.
- `resources/` contains CSS, JavaScript, translations, and a views directory. JavaScript builds go into `resources/dist/`.
- `tests/` contains Pest tests and the Orchestra Testbench setup; `tests/Compatibility/` supplies disposable host fixtures. `.github/workflows/` defines CI checks.

## Build, Test, and Development Commands

Install dependencies with `composer install` and `npm install`.

- `composer test` — run the Pest suite.
- `composer test -- --filter="registers publishable assets"` — run a matching test.
- `composer verify` — run every local check (workflow YAML lint, lint, static analysis, tests, compiled assets, theme audit, distribution archive); `composer verify -- --browser` also runs the browser suites. This replaces the automatic `tests` workflow, which is the only one that runs on its own.
- `composer analyse` — run PHPStan/Larastan at level 4.
- `composer lint` / `composer test:lint` — apply Laravel Pint formatting or check it without edits.
- `composer test:refactor` — preview Rector changes; `composer refactor` applies them.
- `npm run build` / `npm run check:js` — build or verify and minify `resources/js/index.js` using esbuild.
- `npm run build:themes` / `npm run check:themes` — generate the pinned daisyUI theme assets and data, or check committed outputs for drift.
- `npm run dev` — watch JavaScript with inline source maps; this does not start an application server.

The browser compatibility matrix runs on pull requests and default-branch pushes; it is free for public repositories and can also be run locally against the fixtures.

Use a consuming Laravel/Filament application to preview theme changes.

## Coding Style & Naming Conventions

Follow `.editorconfig`: four spaces, UTF-8, LF endings, and a final newline; YAML uses two spaces. Use the configured Laravel Pint preset for PHP. Match PSR-4 filenames to PascalCase classes and use camelCase methods. Prettier is configured for single quotes, no semicolons, and trailing commas in JavaScript. Keep public APIs compatible and avoid unrelated refactoring.

## Testing Guidelines

Add behavioral tests for features and bug fixes in `tests/*Test.php`, using descriptive Pest `it(...)` names. `tests/Pest.php` applies the shared Testbench base class. Tests run in random order, so avoid order dependencies. The architecture test rejects `dd`, `dump`, and `ray`. No minimum coverage percentage is configured. Run tests, formatting checks, and static analysis before submitting code changes.

## Commit & Pull Request Guidelines

History uses short imperative subjects such as `Fix styling` and `Add daisyUI 5 components...`, with occasional `feat:` prefixes; no strict prefix convention is established. Keep commits meaningful and PRs focused on one feature. Follow `.github/CONTRIBUTING.md`: include tests for behavior changes, update relevant documentation, and preserve SemVer compatibility. Describe the change and validation, link related issues, and include screenshots for visible theme changes.
