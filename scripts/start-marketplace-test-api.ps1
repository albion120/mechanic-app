param([Parameter(Mandatory=$true)][string]$BackendDll)
$ErrorActionPreference = 'Stop'
$dllPath = (Resolve-Path -LiteralPath $BackendDll).Path
$testDatabase = Join-Path ([IO.Path]::GetTempPath()) ('mechanicapp-e2e-' + [guid]::NewGuid().ToString('N') + '.db')
$env:ASPNETCORE_ENVIRONMENT = 'Testing'
$env:ASPNETCORE_URLS = 'http://127.0.0.1:5181'
$env:ConnectionStrings__DefaultConnection = 'Data Source=' + $testDatabase
$env:Jwt__Key = [guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()
$env:Jwt__Issuer = 'MechanicApp.API'
$env:Jwt__Audience = 'MechanicApp.Client'
$env:Jwt__ExpiryMinutes = '60'
$env:Cors__AllowedOrigins__0 = 'http://127.0.0.1:5178'
$env:Cors__AllowedOrigins__1 = 'http://127.0.0.1:5179'
# Test-only identity in a fresh temporary database. Never use this for deployment.
$env:AdminBootstrap__Email = 'admin@marketplace.example.test'
$env:AdminBootstrap__Password = 'Local-E2E-Only-Password-123'
try { & dotnet $dllPath }
finally { foreach ($suffix in @('', '-shm', '-wal')) { $testFile = $testDatabase + $suffix; if (Test-Path -LiteralPath $testFile) { Remove-Item -LiteralPath $testFile -Force -ErrorAction SilentlyContinue } } }
