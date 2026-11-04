# HC View – Rules, TODO and Open Questions

Page: Workforce > Headcount View. Endpoint: `GET /api/workforce/hc-view` (`HcViewService`).
Excel: `GET /api/workforce/hc-view/export.xlsx` ("Export Excel" button, same as Market Structure).

## Current state

**Who is counted**
- `employment_status` is `ACTIVE` or `NEW_HIRE`.
- `INACTIVE` employees are not counted: they are people who left the company.
- `PENDING_VALIDATION` is not counted (current behaviour, left as is).
- Employees on bench are counted. Bench is not a status: it is derived (`ACTIVE` + 0% allocated today).

**Where an employee is placed (rows: N-1 / N-2)**
- Placement uses the horizontal node of the project of the employee's latest allocation that started on or before
  today (view `employee_current_horizontal`). Bench employees keep the node of their last project.
- Level 3 nodes roll up to their level 2 parent. A level 1 node without N-2 is shown as `(no N-2)`.
- Employees with no allocation (or only on projects without a node) are shown under `Unassigned`.
- Employees with allocations running today on projects that have a node count as allocation % / 100 in each
  project's node (summed when projects share an N-2 row). 50% + 50% on two projects in different N-2 units shows as
  0.5 in each row; 100% + 50% (over-allocation with override) shows 1 and 0.5; a single project at 50% shows 0.5, and the rest (bench) is not
  counted anywhere. Counts can therefore be decimals (rounded to 2 places), and an employee can total less or more than 1.
- Employees with no allocation running today use only their latest allocation (view above), counted as 1.
- Demo: the page always starts from the hardcoded `HcViewDemoData` headcount and adds the real employees on top
  (counts are summed per N-1 / N-2 / country / type). Remove the demo loop after the demo. The demo rows include
  Brazil, Italy and Germany so the country picker can be shown.

**Columns**
- Country comes from `employee.location`. It is picked from a hard-coded list (`Countries.ALL`: Albania, Brazil,
  Bulgaria, Cameroon, Egypt, Germany, India, Italy, Poland, Romania, Serbia, Spain, Tunisia). The country is required:
  the employee form marks it required, the API rejects a blank value, and the import reports a row error when it is
  blank or not in the list. The old spelling `Brasil` (and any letter case) is read as `Brazil`. A saved value that is
  not in the list stays as it is until someone changes it, and is counted under `Other countries`. Rows saved before the
  field was required and still blank are also counted under `Other countries` until someone sets a country.
- Default columns: Serbia, Albania, Romania, India, Poland, Bulgaria, Cameroon, Tunisia, Egypt, Brazil
  (`Countries.HC_DEFAULT`, `GET /api/workforce/hc-view/default-countries`).
- The page has a country picker. `GET /api/workforce/hc-view?countries=Serbia,Italy` (and the Excel export) shows
  exactly the selected countries; without the parameter the defaults are used. The picker offers the countries that
  have at least one counted employee (`availableCountries` in the response), plus the selected ones.
- One extra column, `Other countries`, appears only when needed, so the columns always add up to the totals. It holds
  employees with no country, a country that is not selected, or a value not in the list.
- Totals always count every counted employee, whatever the selection.
- Workforce type: `EMPLOYEE` = Internal, `B2B` = B2B, `SUPPLIER` = Suppliers.
- Summary: Internal, External (B2B + Suppliers), Total.

## TODO

- HC view
  - Use the project's horizontal (corporate) org instead of the employee's own org.
    All employees count, and employees on bench count under the project of their last allocation. [DONE]
  - Inactive employees are excluded, they are people who left the company. [already there]
  - Keep a date-based history of horizontal assignments. [TODO]
  - Country list: hard-coded for now, picker for extra countries. [DONE] Next phase: a `country` table
    (name, active, hc_default) so new markets need no code change. `employee.location` stays the country name
    (no FK), like the vertical taxonomy. [TODO]
  - Export Excel. [DONE: button on the page, same pattern as Market Structure; sends the selected countries]

## Open questions

- HC view: the project's org is used instead of the employee's own. If an employee is on two projects,
  he is counted in both places, split by allocation percentage. [DECIDED]
- HC view: country stays the employee's location (not the project or client country): bench employees have no
  project, and the project no longer has a country. [DECIDED]
