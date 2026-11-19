// Store details shown on the Contact page and in the footer.
// Fill these in — any field left empty is simply not shown.
export const siteInfo = {
  name: 'CoreMan',
  email: '',          // e.g. 'support@yourdomain.com'
  phone: '',          // e.g. '+880 1XXX-XXXXXX'
  whatsapp: '',       // full number with country code, digits only, e.g. '8801XXXXXXXXX'
  facebook: '',       // full page URL
  instagram: '',      // full profile URL
  address: '',        // showroom / office address
  hours: '',          // e.g. 'Sat–Thu, 10am–8pm'

  // Shipping & returns — keep in sync with OrderService (backend) and CheckoutPage.
  freeShippingThreshold: 2000,
  shippingFee: 120,
  returnDays: 30,
};
