# **App Name**: FinanceFlow PWA

## Core Features:

- Role-Based Login: Simulate multi-role login (admin, agent, customer) with role-based dashboard views
- Customer Registration: Implement a customer registration form with KYC image upload simulated via ImgBB and stored in local storage
- Loan Management: Create loan disbursal and editing features with simulated Supabase database operations using arrays in local storage
- EMI Management: Generate and track EMI schedules with collection status, including topup loans. Payments stored and updated in local storage
- WhatsApp Simulation: Mock WhatsApp integration by displaying a message preview popup, simulating API functionality
- PDF Generation: Enable the generation of loan agreements and EMI schedules as PDF documents using jsPDF library, reflecting original loan and all subsequent topups
- Excel Export: Allow export of EMI lists as Excel sheets using SheetJS library for reporting purposes

## Style Guidelines:

- Deep blue (#2E4765) to convey trust and stability in financial operations
- Light gray (#F0F4F8) for a clean, professional look
- Teal (#45B3A9) for interactive elements and key actions
- 'Inter' (sans-serif) for both headlines and body text, providing a modern, neutral, and readable appearance. Note: currently only Google Fonts are supported.
- Utilize Font Awesome icons to enhance UI elements with clear and recognizable visuals, aligning with financial themes
- Employ Tailwind CSS grid and flexbox to create a responsive and consistent layout across different screen sizes
- Use subtle transitions and animations to provide feedback on user interactions, improving the overall user experience