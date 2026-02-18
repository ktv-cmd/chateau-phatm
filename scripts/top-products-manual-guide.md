# Manual Image Guide for Top Products

## Instructions:
For each product below, search Google Images for the product name, find an image from a retailer (Walmart, CVS, Walgreens, Amazon), right-click and copy the image URL, then run the update command.

## Top 30 Products to Update Manually:

### TYLENOL Products (10):
1. TYLENOL ES TB 500MG 100 CPLT - $18.98
2. TYLENOL ES GC 500MG 100 RRL - $22.95
3. TYLENOL PM TB 25-500MG 100CPLT - $21.99
4. TYLENOL CHD SS 160MG/5ML120ML GRP - $11.99
5. TYLENOL INFANTS SS 160MG/5ML 60ML - $14.99
6. TYLENOL ES TB 500MG 24 - $6.99
7. TYLENOL CHD PK 18 BERRY - $11.99
8. TYLENOL CHD SS 160/5 120ML STB - $11.99
9. TYLENOL ES E2S GC 500MG 100 CPLT - $18.25
10. TYLENOL CHD P/FVR SS160MG/5 120ML - $11.99

### ADVIL Products (9):
1. ADVIL TB 200MG 100 - $16.99
2. ADVIL TB 200MG 50 - $10.95
3. ADVIL TB 200MG 24 - $6.19
4. ADVIL GC 200MG 40 LQGL - $16.95
5. ADVIL PM TB 38-200MG 80 CPLT - $21.95
6. ADVIL DUAL ACTION TB 250-125MG 18 - $6.99
7. ADVIL TB 200MG 24 CPLT - $9.69
8. ADVIL TB 200MG 50 CPLT - $11.15
9. ADVIL JUNIOR STRN CW 100MG 24 GRP - $6.99

### MUCINEX Products (8):
1. MUCINEX TB 600MG 40 ER BPK - $34.99
2. MUCINEX TB 600MG 20 - $19.99
3. MUCINEX DM TB 1200-60MG 28 IR/ER - $28.99
4. MUCINEX DM TB 600-30MG 20 - $19.99
5. MUCINEX FAST MAX C/F LQ 180ML - $14.99
6. MUCINEX F/MAX C/F/ST LQ 177ML - $14.99
7. MUCINEX F/MAX DM LQ 100-5/5 180ML - $14.99
8. MUCINEX NIGHTSHIFT LQ 180ML C/F - $14.99

## How to Update a Product Image:

```bash
# Example for TYLENOL ES TB 500MG 100:
# 1. Google: "tylenol extra strength 500mg 100 tablets"
# 2. Find image from Walmart/CVS/Amazon
# 3. Copy image URL
# 4. Run this SQL in Supabase:

UPDATE products 
SET image_url = 'PASTE_IMAGE_URL_HERE' 
WHERE name LIKE '%TYLENOL ES TB 500MG 100%';
```

## Alternative: Use Current Images

The current professional Unsplash images actually look good and professional for a pharmacy website. Many successful e-commerce sites use category stock photos rather than exact product shots.

## Budget Option:

If you have budget: **Go-UPC Bulk Service** - $90 one-time for all 476 exact product images.
