<?php
namespace App\Support\Marketing;

/**
 * Public marketing content. Every statement here describes behaviour that exists in the app today.
 * No prices, reviews, customer counts, awards or performance promises are published (see docs/SEO_STRATEGY.md).
 */
final class Pages
{
    public const UPDATED = '2026-11-26';
    public const NAME = 'Small Business Command Center';

    /** @return array<string,array<string,mixed>> keyed by slug ('' = home) */
    public static function all(): array
    {
        return [
            '' => [
                'nav' => 'Home',
                'title' => 'Small Business Management Software | Command Center',
                'desc' => 'Run orders, inventory, customers, invoices and expenses from one simple dashboard. Built for small business owners and online sellers.',
                'h1' => 'Small business management software that keeps everything in one place',
                'lead' => 'Small Business Command Center (SBCC) brings your orders, products and stock, customers, invoices, expenses and pricing into a single dashboard, so you can stop juggling spreadsheets and notebooks.',
                'keyword' => 'small business management software',
                'sections' => [
                    ['What you can manage in SBCC', '<p>SBCC is an all-in-one business organizer for people who run a small shop, an online store or a home-based business. Each area works on its own and shares the same records with the others.</p><ul><li><a href="/inventory-management">Inventory and products</a>: SKUs, cost, price, stock on hand, low-stock alerts.</li><li><a href="/order-management">Orders</a>: multi-product orders, payments received, refunds and status tracking.</li><li><a href="/customer-management">Customers</a>: contact details, company and order history in one place.</li><li><a href="/invoice-management">Invoices</a>: print-ready A4 invoices you can download as a PDF.</li><li><a href="/expense-tracking">Expenses</a>: categorised costs that feed straight into your profit figure.</li><li><a href="/pricing-calculator">Pricing</a>: work out the selling price that still leaves the profit you want after fees.</li></ul>'],
                    ['Who SBCC is for', '<p>SBCC is designed for small business owners, online sellers, independent entrepreneurs, handmade and craft sellers, and home-based businesses that have outgrown a spreadsheet but do not need heavy enterprise software.</p><p>If you currently track stock in one file, orders in another and invoices in a third, SBCC gives you one connected workspace instead.</p>'],
                    ['A simple alternative to spreadsheets', '<table><caption>Spreadsheets compared with SBCC</caption><thead><tr><th scope="col">Task</th><th scope="col">Typical spreadsheet setup</th><th scope="col">SBCC</th></tr></thead><tbody><tr><th scope="row">Stock levels</th><td>Edited by hand after every sale</td><td>Available stock is stock minus units on active orders</td></tr><tr><th scope="row">Invoices</th><td>Copy a template, retype the details</td><td>Generated from the order, with your business name and logo</td></tr><tr><th scope="row">Profit</th><td>Separate formulas across several tabs</td><td>Received payments, product costs and expenses combined on the dashboard</td></tr><tr><th scope="row">Pricing</th><td>Manual maths for fees and shipping</td><td>Pricing calculator that includes packaging, shipping and fees</td></tr></tbody></table>'],
                    ['Built to stay simple', '<p>The interface keeps one task per screen, supports light, dark and warm themes, works on phones and tablets, and uses accessible dialogs and keyboard navigation. Your workspace starts empty, so nothing is pre-filled with sample data you would have to delete.</p><p>Each menu page has its own web address, so you can bookmark Orders, Products or Expenses and return straight to it.</p>'],
                ],
                'faq' => [
                    ['What is small business management software?', 'It is software that brings the everyday jobs of running a small business, such as tracking stock, taking orders, keeping customer records, issuing invoices and recording expenses, into one system instead of separate tools.'],
                    ['Can SBCC replace my spreadsheets?', 'For tracking products, stock, orders, customers, invoices, expenses and pricing, yes. Those records are kept in one connected workspace, so totals update without retyping.'],
                ],
                'related' => ['features', 'inventory-management', 'order-management', 'pricing-calculator'],
            ],
            'features' => [
                'nav' => 'Features',
                'title' => 'Features: Inventory, Orders, Invoices, Expenses | SBCC',
                'desc' => 'See every Small Business Command Center feature: inventory tracking, order management, customers, invoices, expenses, pricing and content planning.',
                'h1' => 'All Small Business Command Center features',
                'lead' => 'A complete list of what SBCC does today, grouped by the job you are trying to get done.',
                'keyword' => 'all-in-one business management software',
                'sections' => [
                    ['Dashboard and reporting', '<p>The dashboard shows money received, profit, outstanding payments and the number of orders, plus recent orders, planned orders that are due soon and products running low on stock. You can hide metrics you do not use.</p>'],
                    ['Inventory and products', '<p>Add products with a unique SKU, selling price, cost, stock quantity, restock threshold and a photo. Archive products you no longer sell without losing past orders. Read more about <a href="/inventory-management">inventory tracking</a>.</p>'],
                    ['Orders and payments', '<p>Create orders with several products, shipping, tax and a percentage discount. Record payments, complete or cancel orders, and issue refunds. Cancelled orders release their stock. See <a href="/order-management">order management</a>.</p>'],
                    ['Customers', '<p>Keep contact details, company, address and notes, and see how many orders each customer has placed. See <a href="/customer-management">customer management</a>.</p>'],
                    ['Invoices', '<p>Open a print-ready A4 invoice for any order and download it as a PDF. See <a href="/invoice-management">invoicing</a>.</p>'],
                    ['Expenses', '<p>Record costs by date with an optional category, and see totals by category. Expenses are subtracted when SBCC calculates profit. See <a href="/expense-tracking">expense tracking</a>.</p>'],
                    ['Pricing calculator', '<p>Turn your product cost, packaging, shipping, fees and the profit you want into a minimum selling price. Try the free <a href="/pricing-calculator">pricing and profit calculator</a>.</p>'],
                    ['Content planner and notes', '<p>Plan social posts by platform, date and status, and keep business notes next to the rest of your records.</p>'],
                    ['Account and display options', '<p>Choose your currency (USD, GBP, EUR, PKR, CAD or AUD), set a business name and logo, and pick a light, dark or warm theme.</p>'],
                ],
                'faq' => [],
                'related' => ['inventory-management', 'order-management', 'invoice-management', 'expense-tracking'],
            ],
            'inventory-management' => [
                'nav' => 'Inventory',
                'title' => 'Inventory Management Software for Small Business',
                'desc' => 'Track products, SKUs and stock levels in one simple inventory tracker. See what is available after orders and get low-stock warnings.',
                'h1' => 'Simple inventory management software for small businesses',
                'lead' => 'Know exactly what you have, what is already promised to customers and what needs restocking, without maintaining a stock spreadsheet.',
                'keyword' => 'inventory management software for small business',
                'sections' => [
                    ['How SBCC tracks your stock', '<p>Every product has a unique SKU, a selling price, a cost, the stock you hold and a restock threshold. SBCC shows <strong>available stock</strong>, which is the units you hold minus the units reserved by active orders.</p><p>Completed and processing orders keep their units reserved. Cancelling an order releases them again, so the number you see reflects what you can actually sell.</p>'],
                    ['Low-stock warnings', '<p>Set a restock threshold per product. Products at or below it appear in a low-stock list on the dashboard and are flagged in the product catalogue.</p>'],
                    ['Protection against overselling', '<p>When you add a product to an order, SBCC checks the quantity against what is available and tells you if there is not enough, rather than letting stock go negative.</p>'],
                    ['Archive instead of delete', '<p>When you stop selling a product, archive it. It disappears from new orders but stays in your past orders and invoices, and you can restore it later.</p>'],
                    ['Who it suits', '<p>A simple inventory tracker is a good fit for handmade sellers, small shops and online stores with tens or hundreds of products. SBCC is not a warehouse management system: it does not manage multiple warehouses, barcodes scanners or purchase orders.</p>'],
                ],
                'faq' => [
                    ['How do I track inventory for a small business?', 'List each product with a unique SKU and your starting stock, record every sale as an order, and compare available stock with a restock threshold. SBCC does that calculation for you and flags low stock.'],
                    ['What is the difference between stock and available stock?', 'Stock is what you physically hold. Available stock is stock minus the units already allocated to active orders.'],
                ],
                'related' => ['order-management', 'pricing-calculator', 'features'],
            ],
            'order-management' => [
                'nav' => 'Orders',
                'title' => 'Order Management Software for Small Business',
                'desc' => 'Create multi-product orders, record payments and refunds, and follow every order from processing to completed in one place.',
                'h1' => 'Order management software for small business owners',
                'lead' => 'Keep every order, payment and refund together so you always know what has been paid, what is outstanding and what still needs to ship.',
                'keyword' => 'order management software for small business',
                'sections' => [
                    ['From new order to completed', '<p>Create an order for a customer with one or more products. Add shipping, tax and a percentage discount, then choose its status: processing, planned for a future date, completed or cancelled. Filter your list by status and search by customer or order number.</p>'],
                    ['Payments and outstanding balances', '<p>Record the amount received on each order, add further payments later, and see the outstanding balance across all active orders on the dashboard.</p>'],
                    ['Cancellations and refunds', '<p>Cancelling an order releases its reserved stock. If a customer was paid back, record a refund with its method and amount; the refunded total is tracked against the order and reflected in your received-money figure.</p>'],
                    ['Planned orders and reminders', '<p>Schedule an order for a future date and SBCC reminds you on the dashboard and in the notification menu when it is due soon.</p>'],
                    ['Connected to inventory and invoices', '<p>Orders draw on your <a href="/inventory-management">inventory</a>, so stock updates as you sell, and every order can produce an <a href="/invoice-management">invoice</a> for your customer.</p>'],
                ],
                'faq' => [
                    ['How can a small business track orders?', 'Record each order with its customer, items, price and payment, and update its status as it moves from processing to completed. A tool like SBCC also updates available stock and totals automatically.'],
                    ['Can I record partial payments?', 'Yes. Record the amount received on an order and add more payments later until the order is paid.'],
                ],
                'related' => ['inventory-management', 'invoice-management', 'customer-management'],
            ],
            'invoice-management' => [
                'nav' => 'Invoices',
                'title' => 'Invoice Software for Small Business | PDF Invoices',
                'desc' => 'Turn any order into a professional A4 invoice with your business name and logo, then print it or download it as a PDF.',
                'h1' => 'Small business invoice software with PDF downloads',
                'lead' => 'Create a clean customer invoice from an order in a couple of clicks, without retyping details into a template.',
                'keyword' => 'invoice software for small business',
                'sections' => [
                    ['Invoices generated from your orders', '<p>Because an invoice is built from the order, the customer, items, quantities, prices, shipping, tax, discount, total and amount received are already there. You do not enter anything twice.</p>'],
                    ['Your branding', '<p>Add your business name and logo once in your profile and they appear on every invoice. The invoice uses a clean A4 layout designed to print well.</p>'],
                    ['Print or download as PDF', '<p>Print the invoice from your browser or download it as a PDF to email to your customer.</p>'],
                    ['Know what is paid', '<p>Each invoice reflects the payments recorded on the order, so the amount received and the balance due are always current.</p>'],
                    ['What SBCC invoices are not', '<p>SBCC produces invoices for your records and your customers. It is not an accounting package and does not file taxes. Check your local tax requirements for invoice wording and numbering.</p>'],
                ],
                'faq' => [
                    ['How do I make an invoice for my small business?', 'Record the sale as an order, open the order\'s invoice, check the details and download it as a PDF or print it.'],
                    ['Can I add my logo to invoices?', 'Yes. Upload your logo and business name in your profile and they are used on your invoices.'],
                ],
                'related' => ['order-management', 'customer-management', 'expense-tracking'],
            ],
            'expense-tracking' => [
                'nav' => 'Expenses',
                'title' => 'Expense Tracker for Small Business | SBCC',
                'desc' => 'Record business expenses by category and date, see totals per category, and watch them reduce your profit automatically on the dashboard.',
                'h1' => 'Business expense tracker for small business owners',
                'lead' => 'Log what you spend as you spend it, and see how it affects the profit your business actually makes.',
                'keyword' => 'expense tracker for small business',
                'sections' => [
                    ['Record expenses in seconds', '<p>Add an expense with a name, amount and date, plus an optional category of your own choosing. Edit or delete it later, and undo an accidental deletion straight away.</p>'],
                    ['Totals by category', '<p>See how much you spend on each category so you can spot where money is going. Categories are free text, so you use whatever labels suit your business.</p>'],
                    ['Profit that includes your costs', '<p>SBCC calculates profit from payments received on active orders, minus the cost of the products sold, minus your recorded expenses. Adding an expense updates that figure straight away.</p>'],
                    ['Alongside orders and invoices', '<p>Keep expenses next to <a href="/order-management">orders</a> and <a href="/invoice-management">invoices</a> so you can see income and costs in one workspace.</p>'],
                ],
                'faq' => [
                    ['How do I track business expenses?', 'Record each cost when it happens with an amount, category and date, then review totals by category. Keeping them in the same system as your sales shows your real profit.'],
                ],
                'related' => ['order-management', 'pricing-calculator', 'features'],
            ],
            'pricing-calculator' => [
                'nav' => 'Pricing Calculator',
                'title' => 'Free Product Pricing & Profit Margin Calculator',
                'desc' => 'Work out the selling price that covers your cost, packaging, shipping and platform fees and still leaves the profit you want. Free to use.',
                'h1' => 'Product pricing and profit margin calculator',
                'lead' => 'Enter what a product costs you and the fees you pay. The calculator shows the minimum price that still leaves your target profit.',
                'keyword' => 'product pricing calculator',
                'calculator' => true,
                'sections' => [
                    ['How the price is calculated', '<p>The calculator uses this formula:</p><p><strong>Price = (product cost + packaging + shipping + desired profit + fixed fee) ÷ (1 − percentage fee)</strong></p><p>The percentage fee, such as a marketplace or payment fee, is charged on the selling price itself, which is why the price is divided by (1 − fee) rather than simply adding a percentage.</p>'],
                    ['Worked example', '<p>A product costs 8.00. Packaging is 2.00, shipping is 3.00, you want 10.00 profit, the fixed fee is 0.30 and the percentage fee is 6.5%.</p><p>(8 + 2 + 3 + 10 + 0.30) ÷ (1 − 0.065) = 23.30 ÷ 0.935 = <strong>24.92</strong> (rounded up to the next cent). The percentage fee on that price is 1.62, plus the 0.30 fixed fee, which leaves your 10.00 profit.</p>'],
                    ['Profit margin and markup are different', '<p><strong>Margin</strong> is profit divided by the selling price. <strong>Markup</strong> is profit divided by your cost. A product that costs 60 and sells for 100 has a 40% margin but a 66.7% markup. Pick one and use it consistently when you compare products.</p>'],
                    ['Use it inside SBCC', '<p>Inside the app, the Pricing Lab can start from the cost of a product you already track and compare the suggested price with your current price. <a href="/login">Sign in</a> to use it with your own products.</p>'],
                ],
                'faq' => [
                    ['How do I calculate the selling price of a product?', 'Add your product cost, packaging, shipping, the profit you want and any fixed fee, then divide by one minus the percentage fee (as a decimal). That gives the minimum price that still delivers your target profit.'],
                    ['What is a good profit margin for a small business?', 'It depends heavily on the product and sales channel, so there is no single right number. Calculate your real margin after all fees and costs, then compare products with each other.'],
                ],
                'related' => ['expense-tracking', 'inventory-management', 'features'],
            ],
            'customer-management' => [
                'nav' => 'Customers',
                'title' => 'Customer Management for Small Business | SBCC',
                'desc' => 'Keep customer contact details, company, address, notes and order history organised in one place, linked to every order and invoice.',
                'h1' => 'Customer management for small business owners',
                'lead' => 'Know who your customers are, what they have ordered and how to reach them, without a separate contact list.',
                'keyword' => 'customer management for small business',
                'sections' => [
                    ['One record per customer', '<p>Store name, email, phone, company, address, city, country and private notes. Each customer shows how many orders they have placed.</p>'],
                    ['Created from orders automatically', '<p>If you type a new customer name when creating an order, SBCC includes that customer in your list, so you do not have to enter people twice.</p>'],
                    ['Archive without losing history', '<p>Archive customers you no longer deal with. They stop appearing when you create new orders, while their past orders, invoices and payments stay exactly as they were. Restore them whenever you like.</p>'],
                    ['Connected to orders and invoices', '<p>Customer details flow into <a href="/order-management">orders</a> and <a href="/invoice-management">invoices</a>, which keeps your records consistent.</p>'],
                    ['What this is not', '<p>SBCC keeps customer records for running your business. It is not an email marketing or full CRM platform.</p>'],
                ],
                'faq' => [
                    ['How can I manage customers, expenses and invoices together?', 'Use one system where an order links a customer, its items and payments, an invoice is generated from that order, and expenses are recorded beside it. SBCC is built around that connected flow.'],
                ],
                'related' => ['order-management', 'invoice-management', 'features'],
            ],
            'faq' => [
                'nav' => 'FAQ',
                'title' => 'FAQ: Small Business Management Software Answers',
                'desc' => 'Straight answers on managing a small business: inventory, orders, invoices, expenses, pricing and choosing business management software.',
                'h1' => 'Frequently asked questions about managing a small business',
                'lead' => 'Short, practical answers to common questions, and how Small Business Command Center helps with each.',
                'keyword' => 'what is the best way to manage a small business',
                'sections' => [],
                'faq' => [
                    ['What is the best way to manage a small business?', 'Keep one reliable record of your products, orders, customers, money in and money out, and review it regularly. Whether you use a notebook, a spreadsheet or software, the key is that every sale and cost is recorded once and the totals are always current. Business management software such as SBCC does the bookkeeping arithmetic for you.'],
                    ['How can a small business track inventory and orders?', 'Give each product a unique SKU and an opening stock count, record each sale as an order, and compare available stock with a restock threshold. Available stock is the units you hold minus the units promised to active orders. SBCC calculates this and warns you when stock is low.'],
                    ['How do I calculate the selling price of a product?', 'Add product cost, packaging, shipping, the profit you want and any fixed fee, then divide by one minus your percentage fee. Our free pricing and profit calculator does this for you.'],
                    ['How can I manage customers, expenses and invoices together?', 'Use one workspace where each order links a customer, items and payments, an invoice is produced from the order, and expenses are logged beside it, so profit reflects everything.'],
                    ['What is a simple alternative to spreadsheets for business management?', 'Dedicated small business software replaces separate spreadsheets for stock, orders, invoices and expenses with one connected set of records. SBCC is built for that, with no formulas to maintain.'],
                    ['What features should small business management software include?', 'At minimum: product and stock tracking with low-stock alerts, order and payment tracking, customer records, invoicing, expense tracking, simple profit reporting and a way to price products. Extras such as multi-warehouse or accounting integrations matter only if you need them.'],
                    ['Does SBCC replace accounting software?', 'No. SBCC helps you run daily operations and see profit, but it is not an accounting or tax-filing package.'],
                    ['What currencies does SBCC support?', 'USD, GBP, EUR, PKR, CAD and AUD.'],
                    ['How much does SBCC cost?', 'Pricing and licensing are not published yet. This page will be updated when they are final.'],
                ],
                'related' => ['features', 'pricing-calculator', 'inventory-management'],
            ],
        ];
    }

    /** Slugs of all indexable pages, without the home page. */
    public static function slugs(): array
    {
        return array_values(array_filter(array_keys(self::all()), fn($s) => $s !== ''));
    }
}
