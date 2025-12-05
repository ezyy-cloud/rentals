# Database Setup Instructions

## Supabase Tables Migration

To set up the database tables in your Supabase project:

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Run the Migration SQL**
   - Go to the SQL Editor in your Supabase dashboard
   - Copy the contents of `supabase/migrations/001_initial_schema.sql`
   - Paste and execute the SQL in the SQL Editor

3. **Verify Tables Created**
   - Go to Table Editor in Supabase dashboard
   - You should see the following tables:
     - `users`
     - `device_types`
     - `accessories`
     - `devices`
     - `rentals`
     - `rental_accessories`

## Tables Structure

### Users
- First Name, Last Name, Telephone, Address
- ID Number (unique), Email (unique)
- Date of Birth, Profile Picture (URL)
- Next of Kin: First Name, Last Name, Phone Number

### Device Types
- Name, SKU (unique), Model
- Rental Rate, Deposit

### Accessories
- Name, Description, Quantity

### Devices
- Name, Device Type (foreign key)
- Condition, Scratches, Working State

### Rentals
- User (foreign key), Device (foreign key)
- Start Date, End Date
- Rate, Deposit, Total Paid
- Accessories (many-to-many relationship via `rental_accessories`)

## Row Level Security (RLS)

The tables have RLS enabled with policies that allow authenticated users to manage all data. Adjust these policies based on your security requirements.

