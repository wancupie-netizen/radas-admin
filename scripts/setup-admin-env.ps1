$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$path = Join-Path $repo '.env.local'
if (Test-Path -LiteralPath $path) { throw '.env.local already exists. Stop for review before replacing configuration.' }
function Read-PrivateValue {
    param([string]$Label)
    $secret = Read-Host $Label -AsSecureString
    $pointer = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    try { return [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer).Trim() }
    finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer); $secret.Dispose() }
}
$values = [ordered]@{
    SUPABASE_URL = 'https://fyqvvkpzcwrmyozxlqkw.supabase.co'
    SUPABASE_PUBLISHABLE_KEY = (Read-PrivateValue 'Supabase publishable key (or legacy anon key)')
    R2_ENDPOINT = 'https://a00de086f4abf120e0619109e66eeef0.r2.cloudflarestorage.com'
    R2_BUCKET = 'radas-admin-storage'
    R2_ACCESS_KEY_ID = (Read-PrivateValue 'R2 Access Key ID')
    R2_SECRET_ACCESS_KEY = (Read-PrivateValue 'R2 Secret Access Key')
}
foreach ($name in $values.Keys) {
    if (-not $values[$name] -or $values[$name] -match '[\r\n]' -or $values[$name] -notmatch '^[A-Za-z0-9_./:-]+$') {
        throw "Invalid value for $name. No configuration written."
    }
}
if ($values.SUPABASE_PUBLISHABLE_KEY -notmatch '^(sb_publishable_|eyJ)') { throw 'Use a Supabase publishable or anon key.' }
$lines = foreach ($name in $values.Keys) { "$name=$($values[$name])" }
[System.IO.File]::WriteAllText($path, ($lines -join "`n") + "`n", [System.Text.UTF8Encoding]::new($false))
Write-Host 'Local server configuration saved. Values are hidden and .env.local is ignored by Git.'
