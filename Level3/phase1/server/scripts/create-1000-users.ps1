$url = "http://127.0.0.1:8000/create"
$body = '{"name":"fardin","email":"fardin@gmail.com","password":"12345"}'
$curlBody = $body.Replace('"', '\"')

for ($i = 1; $i -le 1000; $i++) {
    $response = & curl.exe `
        --silent `
        --show-error `
        --request POST `
        $url `
        --header "Content-Type: application/json" `
        --data-raw $curlBody `
        --write-out "`n%{http_code}"

    if ($LASTEXITCODE -ne 0) {
        throw "curl failed on request $i."
    }

    $responseText = $response -join "`n"
    $statusMatch = [regex]::Match($responseText, "(?:\r?\n)(\d{3})$")
    if (-not $statusMatch.Success) {
        throw "Could not read the HTTP status on request $i. Response: $responseText"
    }

    $statusCode = [int]$statusMatch.Groups[1].Value
    if ($statusCode -lt 200 -or $statusCode -ge 300) {
        throw "Request $i failed with HTTP $statusCode. Response: $responseText"
    }

    if ($i % 100 -eq 0) {
        Write-Host "Created $i users."
    }
}
