# Test Termii Webhook Delivery Status
# This script simulates Termii sending delivery status updates to your webhook

param(
    [string]$NgrokUrl = "https://c2b7d26f4142.ngrok-free.app",
    [string]$PhoneNumber = $env:TEST_PHONE_NUMBER -replace "\+234", "0",
    [string]$Status = "DELIVERED",
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

Write-Host "`n=== Termii Webhook Delivery Status Test ===" -ForegroundColor Cyan
Write-Host "Webhook URL: $NgrokUrl/api/webhooks/notifications/termii/delivery" -ForegroundColor Gray
Write-Host "Phone Number: $PhoneNumber" -ForegroundColor Gray
Write-Host "Status: $Status" -ForegroundColor Gray

# Create webhook payload matching Termii's actual format
$webhookData = @{
    type = "delivery"
    id = "termii-" + (Get-Random -Maximum 999999)
    message_id = "msg-" + (Get-Random -Maximum 999999)
    receiver = $PhoneNumber
    sender = "modev"  # Actual Termii sender ID from .env
    message = "Your BenPharm order #" + (Get-Random -Maximum 9999) + " has been processed."
    sent_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'")
    cost = "3.00"
    status = $Status
    channel = "generic"
}

# Convert to JSON (compact format like Termii would send)
$jsonBody = $webhookData | ConvertTo-Json -Compress

# Generate HMAC SHA512 signature
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

$signature = Get-HMACSHA512 -Message $jsonBody -Secret $Secret

Write-Host "`nWebhook Payload:" -ForegroundColor Yellow
$webhookData | ConvertTo-Json

Write-Host "`nGenerated Signature (first 32 chars):" -ForegroundColor Yellow
Write-Host $signature.Substring(0, 32) + "..." -ForegroundColor Gray

# Headers matching what Termii would send
$headers = @{
    "Content-Type" = "application/json"
    "X-Termii-Signature" = $signature
    "ngrok-skip-browser-warning" = "true"
    "User-Agent" = "Termii-Webhook/1.0"
}

$webhookUrl = "$NgrokUrl/api/webhooks/notifications/termii/delivery"

Write-Host "`nSending webhook request..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method POST -Headers $headers -Body $jsonBody
    
    Write-Host "`n✅ Webhook delivered successfully!" -ForegroundColor Green
    Write-Host "`nResponse:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
    
    if ($response.notificationId) {
        Write-Host "`nNotification ID: $($response.notificationId)" -ForegroundColor Green
        Write-Host "Internal Status: $($response.status)" -ForegroundColor Green
    }
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "`n❌ Webhook failed with status code: $statusCode" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    
    # Try to get error details
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "`nError Response:" -ForegroundColor Red
        Write-Host $errorBody
    } catch {}
    
    if ($statusCode -eq 401) {
        Write-Host "`nPossible issues:" -ForegroundColor Yellow
        Write-Host "1. TERMII_WEBHOOK_SECRET mismatch between .env and running server" -ForegroundColor Yellow
        Write-Host "2. Server needs restart after .env changes" -ForegroundColor Yellow
        Write-Host "3. Signature calculation issue" -ForegroundColor Yellow
        Write-Host "`nTry restarting your Next.js server to load the latest .env values" -ForegroundColor Cyan
    }
}

Write-Host "`n=== Test Different Scenarios ===" -ForegroundColor Cyan
Write-Host "Test successful delivery:" -ForegroundColor Gray
Write-Host "  .\scripts\test-termii-webhook-delivery.ps1 -Status 'DELIVERED'" -ForegroundColor White

Write-Host "`nTest failed delivery:" -ForegroundColor Gray
Write-Host "  .\scripts\test-termii-webhook-delivery.ps1 -Status 'Message Failed'" -ForegroundColor White

Write-Host "`nTest DND blocking:" -ForegroundColor Gray
Write-Host "  .\scripts\test-termii-webhook-delivery.ps1 -Status 'DND Active on Phone Number'" -ForegroundColor White

Write-Host "`nTest with different phone number:" -ForegroundColor Gray
Write-Host "  .\scripts\test-termii-webhook-delivery.ps1 -PhoneNumber '+234XXXXXXXXX'" -ForegroundColor White
