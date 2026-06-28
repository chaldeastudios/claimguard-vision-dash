---
name: claimguard-frontend-brand
description: Ensures UI components follow ClaimGuard's brand guidelines (color palette, typography, button shapes, and cards).
---

# ClaimGuard Frontend Brand Guidelines

Apply these instructions when modifying or creating UI components for the ClaimGuard dashboard or landing page.

## Brand Identity Tokens

- **Background**: Warm off-white `rgb(255, 254, 251)`, never pure white or cool gray.
- **Headings**: `IBM Plex Serif` font.
  - **Signature Design Element**: Choose one key word per heading, make it *italicized*, and color it orange `rgb(251, 96, 50)`. Do not skip this!
- **Body Text**: `IBM Plex Sans` font, muted gray, never pure black.
- **Buttons**: Pill-shaped, solid color, warm brown `rgb(141, 105, 89)` with white text.
- **Cards**: Flat color blocks with NO borders or shadows.
  - Allowed colors: Cream `rgb(229, 224, 217)`, Sage Green `rgb(161, 161, 106)`, Near-Black `rgb(41, 37, 36)`.
  - Corner radius: Large, `20px` to `24px` (`rounded-2xl` or `rounded-3xl`).
- **Icons**: Abstract botanical/organic glyphs in warm brown, rather than generic line icons.
- **Risk Badges**:
  - High Risk: Red
  - Medium Risk: Orange/Amber
  - Low Risk: Green

## Pages and Layouts

- `/` (Landing Page): Marketing page pitching to insurance companies/payers (e.g. SHA), not hospitals.
- `/dashboard` (Dashboard): Overview, Claims Queue, Hospitals, Settings.
- Detail panels/modals: Full claim details, reasons for flagged risk, Approve/Flag/Reject actions that write to the Supabase database.
