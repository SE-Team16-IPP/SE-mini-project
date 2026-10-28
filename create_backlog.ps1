# Creates labels, issues and Project items from backlog.csv using GitHub CLI.
# One-time: gh auth login ; gh auth refresh -s project
# In the GitHub Project, first add a Number field "Story Points" and a Single select field "Sprint" with options "Sprint 1" and "Sprint 2".
param(
  [Parameter(Mandatory=$true)][int]$ProjectNumber,
  [string]$Owner = "rahulb1800",
  [string]$Repo  = "rahulb1800/SE-mini-project",
  [int]$Limit = 0   # test run: set to 1 to create only the first row
)
# MEMBER1 = Prateek (SRS), MEMBER2 = Rahul (SAD), MEMBER3 = Dhoni (Test plan)
$users = @{ "MEMBER1" = "prateekhachadad"; "MEMBER2" = "rahulb1800"; "MEMBER3" = "dhonisatwik" }

$rows = Import-Csv "$PSScriptRoot\backlog.csv"
if ($Limit -gt 0) { $rows = $rows | Select-Object -First $Limit }
$projId = (gh project view $ProjectNumber --owner $Owner --format json | ConvertFrom-Json).id
$fields = (gh project field-list $ProjectNumber --owner $Owner --format json | ConvertFrom-Json).fields
$spField = $fields | Where-Object { $_.name -eq "Story Points" }
$sprintField = $fields | Where-Object { $_.name -eq "Sprint" }

$labels = @($rows | ForEach-Object { $_.Type; $_.Module }) | Sort-Object -Unique
foreach ($label in $labels) {
  gh label create $label --repo $Repo --force | Out-Null
}

foreach ($r in $rows) {
  $body = "**Requirement ID:** $($r.ID)`n**Priority:** $($r.Priority)`n**Story points:** $($r.StoryPoints)`n`n**Acceptance criteria:** $($r.AcceptanceCriteria)"
  $url = gh issue create --repo $Repo --title "$($r.ID): $($r.Title)" --body $body --label $r.Type --label $r.Module --assignee $users[$r.Assignee]
  if ($LASTEXITCODE -ne 0 -or -not $url) { Write-Host "FAILED to create issue for $($r.ID). Stopping." -ForegroundColor Red; break }
  $item = gh project item-add $ProjectNumber --owner $Owner --url $url --format json | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0 -or -not $item) { Write-Host "Issue created ($url) but FAILED to add to Project for $($r.ID). Stopping." -ForegroundColor Red; break }
  gh project item-edit --id $item.id --project-id $projId --field-id $spField.id --number $r.StoryPoints | Out-Null
  $opt = ($sprintField.options | Where-Object { $_.name -eq $r.Sprint }).id
  gh project item-edit --id $item.id --project-id $projId --field-id $sprintField.id --single-select-option-id $opt | Out-Null
  Write-Host "Created $($r.ID) -> $url"
}
