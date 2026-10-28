# Sets Story Points and Sprint on issues already in a GitHub Project, matching by ID (e.g. IPP-F-010) from backlog.csv.
# Before running: in the Project add a Number field "Story Points" and a Single select field "Sprint" (options "Sprint 1", "Sprint 2").
# One-time: gh auth refresh -s project
param(
  [int]$ProjectNumber = 1,
  [string]$Owner = "SE-Team16-IPP"
)
$rows = Import-Csv "$PSScriptRoot\backlog.csv"
$projId = (gh project view $ProjectNumber --owner $Owner --format json | ConvertFrom-Json).id
$fields = (gh project field-list $ProjectNumber --owner $Owner --format json | ConvertFrom-Json).fields
$sp = $fields | Where-Object { $_.name -eq "Story Points" }
$sprint = $fields | Where-Object { $_.name -eq "Sprint" }
if (-not $sp -or -not $sprint) { Write-Host "Create the 'Story Points' and 'Sprint' fields in the Project first." -ForegroundColor Red; exit 1 }

$items = (gh project item-list $ProjectNumber --owner $Owner --limit 200 --format json | ConvertFrom-Json).items
Write-Host "Found $($items.Count) items in the Project"
$done = 0
foreach ($r in $rows) {
  $item = $items | Where-Object { $_.title -like "$($r.ID):*" } | Select-Object -First 1
  if (-not $item) { Write-Host "Not in Project: $($r.ID)" -ForegroundColor Yellow; continue }
  gh project item-edit --id $item.id --project-id $projId --field-id $sp.id --number $r.StoryPoints | Out-Null
  $opt = ($sprint.options | Where-Object { $_.name -eq $r.Sprint }).id
  gh project item-edit --id $item.id --project-id $projId --field-id $sprint.id --single-select-option-id $opt | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Host "FAILED on $($r.ID)" -ForegroundColor Red; break }
  $done++
  Write-Host "Set $($r.ID): $($r.StoryPoints) points, $($r.Sprint)"
}
Write-Host "Updated $done of $($rows.Count) items"
