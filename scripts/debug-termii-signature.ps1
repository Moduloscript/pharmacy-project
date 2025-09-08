# Debug Termii Webhook Signature
# This script helps debug signature verification issues

param(
    [string]$NgrokUrl = "https://c2b7d26f4142.ngrok-free.app",
    [string]$Secret = $env:TERMII_WEBHOOK_SECRET
)

# If secret not provided, try to read from .env file
if (-not $Secret) {
    $envFile = Get-Content .env -Raw
    if ($envFile -match 'TERMII_WEBHOOK_SECRET=([^\s"]+)') {
        $Secret = $matches[1]
        Write-Host "Using webhook secret from .env file" -ForegroundColor Gray
    } else {
        Write-Host "ERROR: TERMII_WEBHOOK_SECRET not found in environment or .env file!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n=== Termii Webhook Signature Debug ===" -ForegroundColor Cyan
Write-Host "Debug URL: $NgrokUrl/api/webhooks/notifications/debug-signature" -ForegroundColor Gray

# Create sample webhook payload
$webhookData = @{
    type = "delivery"
    id = "termii-12345"
    message_id = "msg-67890"
    receiver = $env:TEST_PHONE_NUMBER -replace "\+234", "0"
    sender = "modev"
    message = "Test message"
    sent_at = "2025-01-07T12:00:00Z"
    cost = "3.00"
    status = "DELIVERED"
    channel = "generic"
}

# Test different JSON formatting
Write-Host "`nTesting different JSON serialization methods..." -ForegroundColor Yellow

# Method 1: Compact JSON (no spaces)
$compactJson = $webhookData | ConvertTo-Json -Compress
Write-Host "`nCompact JSON (first 100 chars):" -ForegroundColor Gray
Write-Host $compactJson.Substring(0, [Math]::Min(100, $compactJson.Length))

# Generate signature for compact JSON
function Get-HMACSHA512 {
    param(
        [string]$Message,
        [string]$Secret
    )
    
    $hmac = New-Object System.Security.Cryptography.HMACSHA512
    $hmac.Key = [Text.Encoding]::UTF8.GetBytes($Secret)
    $hashBytes = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($Message))
    return [BitConverter]::ToString($hashBytes).Replace('-', '').ToLower()
}

$signature = Get-HMACSHA512 -Message $compactJson -Secret $Secret

Write-Host "`nGenerated Signature (first 32 chars):" -ForegroundColor Yellow
Write-Host $signature.Substring(0, 32) + "..." -ForegroundColor Gray

# Headers
$headers = @{
    "Content-Type" = "application/json"
    "X-Termii-Signature" = $signature
    "ngrok-skip-browser-warning" = "true"
}

$debugUrl = "$NgrokUrl/api/webhooks/notifications/debug-signature"

Write-Host "`nSending debug request..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $debugUrl -Method POST -Headers $headers -Body $compactJson
    
    Write-Host "`n✅ Debug response received!" -ForegroundColor Green
    Write-Host "`nDebug Results:" -ForegroundColor Cyan
    $response.debug | ConvertTo-Json -Depth 5
    
    if ($response.recommendation) {
        Write-Host "`nRecommendation: $($response.recommendation)" -ForegroundColor Green
    }
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "`n❌ Debug request failed with status code: $statusCode" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "`nError Response:" -ForegroundColor Red
        Write-Host $errorBody
    } catch {}
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Check if any of the signature methods match" -ForegroundColor Gray
Write-Host "2. If 'direct' matches, the raw body is being used correctly" -ForegroundColor Gray
Write-Host "3. If 'compact' matches, JSON needs to be re-serialized" -ForegroundColor Gray
Write-Host "4. If none match, there might be a secret mismatch or encoding issue" -ForegroundColor Gray
