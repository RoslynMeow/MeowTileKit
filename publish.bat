@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   MeowTileKit  -  publish to npm (core/ui/meta)
echo ============================================
echo.

where npm >nul 2>nul || (echo [x] npm not found in PATH & exit /b 1)

echo [*] Build all packages
call npm run build
if errorlevel 1 (echo [x] build failed & exit /b 1)
echo.

echo [*] Check login ^(npm whoami^)
call npm whoami
if errorlevel 1 (echo [x] not logged in. Run: npm login & exit /b 1)
echo.

echo [*] Publish meow-tile-kit-core
call npm publish -w meow-tile-kit-core --access public
if errorlevel 1 (echo [x] publish core failed & exit /b 1)

echo [*] Publish meow-tile-kit-ui
call npm publish -w meow-tile-kit-ui --access public
if errorlevel 1 (echo [x] publish ui failed & exit /b 1)

echo [*] Publish meow-tile-kit (meta)
call npm publish -w meow-tile-kit --access public
if errorlevel 1 (echo [x] publish meta failed & exit /b 1)

echo.
echo [ok] published to npm: core / ui / meta
echo.
echo Note: GitHub Packages is published automatically by the
echo       "Publish to GitHub Packages" workflow on push to main
echo       (it only publishes a package when its version is new).
echo.
endlocal
