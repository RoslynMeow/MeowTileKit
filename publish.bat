@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   MeowTileKit  -  publish to npm
echo ============================================
echo.

set "VER=%~1"

where npm >nul 2>nul || (echo [x] npm not found in PATH & exit /b 1)

if not "%VER%"=="" (
  echo [*] Set version to %VER%
  pushd package
  call npm version %VER% --no-git-tag-version || (echo [x] npm version failed & popd & exit /b 1)
  popd
) else (
  for /f "delims=" %%v in ('node -p "require('./package/package.json').version"') do set "VER=%%v"
  echo [*] Use current package.json version: !VER!
)
echo.

pushd package

echo [*] Check login ^(npm whoami^)
call npm whoami
if errorlevel 1 (
  echo [x] Not logged in. Run: npm login
  popd & exit /b 1
)
echo.

echo [*] Build
call npm run build
if errorlevel 1 (echo [x] Build failed & popd & exit /b 1)
echo.

echo [*] Publish meow-tile-kit@!VER! to registry.npmjs.org
call npm publish --access public
if errorlevel 1 (echo [x] Publish failed & popd & exit /b 1)

popd

echo.
echo [ok] Published meow-tile-kit@!VER!
echo.
echo Tip: commit the version bump and (optionally) tag the release:
echo   git add package/package.json package/package-lock.json
echo   git commit -m "release: v!VER!"
echo   git tag v!VER! ^&^& git push origin v!VER!
echo.

endlocal
