# Test webhook without signature verification
# This simulates Termii sending delivery status without signature

$webhookUrl = "http://localhost:3000/api/webhooks/notifications/termii/delivery"

# Create webhook payload
$webhookData = @{
    type = "delivery"
    id = "termii-" + (Get-Random -Maximum 999999)
    message_id = "msg-" + (Get-Random -Maximum 999999)
    receiver = $env:TEST_PHONE_NUMBER -replace "\+234", "0"
    sender = "modev"
    message = "Test message"
    sent_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'")
    cost = "3.00"
    status = "DELIVERED"
    channel = "generic"
}

$jsonBody = $webhookData | ConvertTo-Json -Compress

Write-Host ""
Write-Host "=== Webhook Test (No Signature) ===" -ForegroundColor Cyan
Write-Host "URL: $webhookUrl" -ForegroundColor Gray
Write-Host ""
Write-Host "Payload:" -ForegroundColor Yellow
$webhookData | ConvertTo-Json

# Headers without signature
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host ""
Write-Host "Sending webhook..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method POST -Headers $headers -Body $jsonBody
    
    Write-Host ""
    Write-Host "SUCCESS - Webhook accepted!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
    
    if ($response.notificationId) {
        Write-Host ""
        Write-Host "Notification Updated:" -ForegroundColor Green
        Write-Host "  ID: $($response.notificationId)" -ForegroundColor Green
        Write-Host "  Status: $($response.status)" -ForegroundColor Green
    }
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host ""
    Write-Host "FAILED - Status: $statusCode" -ForegroundColor Red
    
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error:" -ForegroundColor Red
        Write-Host $errorBody
    } catch {}
    
    if ($statusCode -eq 401) {
        Write-Host ""
        Write-Host "401 means signature verification is still active" -ForegroundColor Yellow
        Write-Host "Check that TERMII_WEBHOOK_SECRET is commented in .env.local" -ForegroundColor Yellow
    }
}

Write-Host ""
