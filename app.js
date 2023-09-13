const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const bodyParser = require("body-parser");
const invoices = [];
const PDFDocument = require("pdfkit"); // Import the pdfkit library
const puppeteer = require("puppeteer");
const numeral = require("numeral");

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// Helper function to format numbers with a period as a thousand separator
function formatAmount(amount) {
  return numeral(amount).format("0,0.[000]");
}

// Routes
app.get("/", (req, res) => {
  res.render("index", { invoices, formatAmount });
});

app.post("/create-invoice", (req, res) => {
  const { customerName, amount } = req.body;
  const invoice = {
    id: invoices.length + 1,
    customerName,
    amount,
  };
  invoices.push(invoice);
  res.redirect("/");
});

app.get("/download-invoice/:id", async (req, res) => {
  const invoiceId = req.params.id;
  const invoice = invoices.find((inv) => inv.id == invoiceId);

  if (!invoice) {
    return res.status(404).send("Invoice not found");
  }

  // Create a new headless browser instance
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Generate the PDF with the same HTML content as displayed on the page
  await page.setContent(`
      <html>
        <head>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-eSj7q2htFqF9W5bC4Ije5gpP0F5F7bbBEv5Bd5m9sr3tNMjhj5z3tss2n5U85/Z5W" crossorigin="anonymous">
        <style>
            .card {
                background-color: #f8f9fa;
                border: 1px solid #dee2e6;
            }
            
            .btn-primary {
                background-color: #007bff;
                border-color: #007bff;
            }          
        </style>
      </head>
      <body>
        <div class="container mt-5">
          <h1 class="text-center">Invoice</h1>
          <div class="card mb-3">
            <div class="card-body">
              <h5 class="card-title">Invoice ID: ${invoice.id}</h5>
              <p class="card-text">Customer Name: ${invoice.customerName}</p>
              <p class="card-text">Amount: Rp ${formatAmount(
                invoice.amount
              )}</p>
            </div>
          </div>
        </div>
      </body>
    </html>
    `);

  // Generate the PDF file
  const pdfBuffer = await page.pdf({ format: "A4" });

  // Close the browser
  await browser.close();

  // Send the PDF as a downloadable file
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="invoice_${invoice.id}.pdf"`
  );
  res.setHeader("Content-Type", "application/pdf");
  res.send(pdfBuffer);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
