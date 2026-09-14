# Monthly Tally PWA — historical-data version

This version is preloaded with the historical data recovered from `Monthly tally.xlsx`.

Imported:
- 10 monthly Tally blocks
- 74 expense records
- 26 payment records
- 14 advance records
- 94 attendance employee-month records
- 19 Devki account dated rows
- 38 Personal account dated rows
- 6 Daily Work entries
- The workbook's calculated Total Profit is preserved as ₹2,211,978.28

## Important
The original Excel file contains malformed style XML that prevents some spreadsheet libraries from opening it. The workbook was normalized through LibreOffice first; the actual cell data and calculated values were then extracted. The original workbook itself is not modified.

## Run
Because this is a PWA, serve this folder over HTTPS in production. For local testing, any static web server works, e.g.:
`python -m http.server 8000`

Open the local address in a browser. For iPhone installation, deploy it to an HTTPS host and use Safari → Share → Add to Home Screen.

## Data
Historical data is bundled in `seed-data.json`. App edits are stored in the browser's localStorage. Use "Export app data" for backups.
