# Chateau Drug & Homecare

A production-ready, ADA-compliant web application for pharmacy item requests, similar to Instacart but without in-app payments.

## Features

- **Customer Interface**: Browse products, add to cart, place orders, view order history
- **Admin Dashboard**: Manage products and orders
- **Google Sheets Integration**: Orders automatically sync to Google Sheets via webhook
- **ADA/WCAG 2.1 AA Compliant**: Full accessibility support
- **Mobile-First Design**: Responsive across all devices

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up Supabase:
   - Create a new Supabase project
   - Copy the SQL schema from `supabase/schema.sql` and run it in your Supabase SQL editor
   - Copy your Supabase URL and anon key to `.env.local`

3. Configure environment variables:
```bash
cp .env.local.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for seeding)
- `NEXT_PUBLIC_SHEETS_WEBHOOK_URL`: Your Google Apps Script webhook URL

4. Seed the database:
```bash
npm run seed
```

This will create:
- 100 pharmacy products
- Demo owner user: admin@chateau-demo.com / DemoAdmin123!
- Demo customer user: customer@chateau-demo.com / DemoUser123!

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Google Sheets Webhook Setup

1. Create a Google Apps Script project
2. Deploy it as a web app with execute as "Me" and access "Anyone"
3. Use the web app URL as your `NEXT_PUBLIC_SHEETS_WEBHOOK_URL`

Example Google Apps Script:
```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  
  // Add headers if first row
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Order ID', 'Date', 'Customer Name', 'Email', 'Phone', 'Address', 'Items', 'Notes']);
  }
  
  const items = data.items.map(i => `${i.name} x${i.qty}`).join(', ');
  const address = `${data.address.line1}, ${data.address.city}, ${data.address.state} ${data.address.zip}`;
  
  sheet.appendRow([
    data.orderId,
    data.createdAt,
    data.customer.name,
    data.customer.email,
    data.customer.phone,
    address,
    items,
    data.notes || ''
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({success: true}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Supabase (Database & Auth)
- Tailwind CSS
- React Hook Form
- Zod (Validation)

## Accessibility

This application is built with WCAG 2.1 AA compliance:
- Semantic HTML structure
- Full keyboard navigation
- Screen reader support
- Proper ARIA labels and landmarks
- Accessible forms and modals
- Color contrast compliance
