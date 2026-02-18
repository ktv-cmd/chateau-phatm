# Image Match Rule (Strict)

This rule is enforced by `scripts/check-and-fix-cards-one-by-one.ts`.

## Goal
Only change an image if the candidate source text **explicitly** matches:

1. **Form** (tablets, caplets, capsules, gel caps, liquid gels, drops, spray, cream, ointment, pads, etc.)
2. **Count/Size** (e.g., 12 ct, 30 count, 20 liquid gels, 10 ml)

If either form or count is missing in the candidate source text, the image is **not updated**.

## How it works
- Build a strict “semantic fingerprint” from the product name:
  - Form tokens (from the product abbreviations).
  - Count tokens (from explicit count/size indicators).
- Search Amazon results.
- Extract item titles and image URLs.
- Only accept a candidate **if** its title contains both:
  - A **form** alias (e.g., "tablets", "liquid gels").
  - A **count** pattern (e.g., "12 ct", "30 count").

## Result
- **No match → no update**
- **Match → update and verify**

## Notes
- The rule is strict by design to prevent wrong package size/form.
- If a product lacks an explicit count or form in the name, it will be skipped.
