$files = @(".env", ".env.dev")
$targetUrl = "DATABASE_URL_LOCAL=postgresql://admin:admin123@localhost:5432/aihub_db?schema=public"

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Updating $file..."
        $content = Get-Content $file
        $newContent = @()
        $foundUrl = $false
        
        foreach ($line in $content) {
            if ($line -match "^DATABASE_URL_LOCAL=") {
                $newContent += $targetUrl
                $foundUrl = $true
            } elseif ($line -match "^POSTGRES_USER=") {
                $newContent += "POSTGRES_USER=admin"
            } elseif ($line -match "^POSTGRES_PASSWORD=") {
                $newContent += "POSTGRES_PASSWORD=admin123"
            } elseif ($line -match "^POSTGRES_DB=") {
                $newContent += "POSTGRES_DB=aihub_db"
            } else {
                $newContent += $line
            }
        }
        
        if (-not $foundUrl) {
            $newContent += $targetUrl
        }
        
        $newContent | Set-Content $file -Encoding UTF8
        Write-Host "✅ Updated $file"
    } else {
        Write-Host "⚠️ $file not found"
    }
}
