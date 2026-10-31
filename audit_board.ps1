# Compares the GitHub Project board and the repo's issues with backlog.csv. Changes nothing.
param(
  [int]$ProjectNumber = 1,
  [string]$Owner = "SE-Team16-IPP",
  [string]$Repo = "SE-Team16-IPP/SE-mini-project"
)

$rows = Import-Csv "$PSScriptRoot\backlog.csv"
$ids = @($rows.ID)

$items = @((gh project item-list $ProjectNumber --owner $Owner --limit 300 --format json | ConvertFrom-Json).items)
$issueItems = @($items | Where-Object { $_.content.type -eq "Issue" })
$otherItems = @($items | Where-Object { $_.content.type -ne "Issue" })

Write-Host "`n=== Board summary ===" -ForegroundColor Cyan
Write-Host "Total items on the board: $($items.Count)"
Write-Host "Issues: $($issueItems.Count)   Other (pull requests, drafts): $($otherItems.Count)   Expected issues: $($ids.Count)"

Write-Host "`n=== IPP-F-051 and IPP-F-052 ===" -ForegroundColor Cyan
foreach ($id in @("IPP-F-051", "IPP-F-052")) {
  $m = @($issueItems | Where-Object { $_.title -like "${id}:*" })
  if ($m.Count -eq 0) { Write-Host "$id : NOT on the board" -ForegroundColor Yellow }
  foreach ($i in $m) { Write-Host "$id : issue #$($i.content.number), status '$($i.status)', sprint '$($i.sprint)'" }
}

Write-Host "`n=== Backlog IDs missing from the board ===" -ForegroundColor Cyan
$missing = @()
foreach ($id in $ids) {
  if (-not (@($issueItems | Where-Object { $_.title -like "${id}:*" }).Count)) { $missing += $id }
}
if ($missing.Count) { $missing | ForEach-Object { Write-Host $_ } } else { Write-Host "none" }

Write-Host "`n=== Backlog IDs that appear more than once on the board (duplicates) ===" -ForegroundColor Cyan
$dupFound = $false
foreach ($id in $ids) {
  $m = @($issueItems | Where-Object { $_.title -like "${id}:*" })
  if ($m.Count -gt 1) {
    $dupFound = $true
    Write-Host "$id : issues $((($m | ForEach-Object { '#' + $_.content.number }) -join ', '))"
  }
}
if (-not $dupFound) { Write-Host "none" }

Write-Host "`n=== Issues on the board that are not in backlog.csv (extras) ===" -ForegroundColor Cyan
$extraFound = $false
foreach ($i in $issueItems) {
  $known = $false
  foreach ($id in $ids) { if ($i.title -like "${id}:*") { $known = $true; break } }
  if (-not $known) {
    $extraFound = $true
    Write-Host "#$($i.content.number)  '$($i.title)'  status '$($i.status)'  item id $($i.id)"
  }
}
if (-not $extraFound) { Write-Host "none" }

Write-Host "`n=== Pull requests and drafts on the board ===" -ForegroundColor Cyan
if ($otherItems.Count) {
  foreach ($o in $otherItems) { Write-Host "$($o.content.type) #$($o.content.number)  '$($o.title)'  status '$($o.status)'  item id $($o.id)" }
} else { Write-Host "none" }

Write-Host "`n=== Repo issues (open and closed) that are not in backlog.csv ===" -ForegroundColor Cyan
$repoIssues = @(gh issue list --repo $Repo --state all --limit 300 --json number,title,state | ConvertFrom-Json)
$repoExtra = $false
foreach ($r in $repoIssues) {
  $known = $false
  foreach ($id in $ids) { if ($r.title -like "${id}:*") { $known = $true; break } }
  if (-not $known) { $repoExtra = $true; Write-Host "#$($r.number)  [$($r.state)]  '$($r.title)'" }
}
if (-not $repoExtra) { Write-Host "none" }

Write-Host "`n=== Repo issues with a duplicated ID ===" -ForegroundColor Cyan
$repoDup = $false
foreach ($id in $ids) {
  $m = @($repoIssues | Where-Object { $_.title -like "${id}:*" })
  if ($m.Count -gt 1) { $repoDup = $true; Write-Host "$id : $((($m | ForEach-Object { '#' + $_.number }) -join ', '))" }
}
if (-not $repoDup) { Write-Host "none" }
Write-Host ""
