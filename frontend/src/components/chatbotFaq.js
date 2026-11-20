import { siteInfo as s } from '../siteInfo';

const taka = (n) => `৳${Number(n).toLocaleString('en-US')}`;

/**
 * Answers for the basic chatbot. Edit freely: `question` is the button text, `keywords` are matched
 * against what the customer types (English, Banglish and Bangla), `answer` supports [link](/path),
 * **bold** and "- " bullet lines.
 */
export const FAQ = [
  {
    id: 'delivery',
    question: 'How much is delivery?',
    keywords: ['delivery', 'shipping', 'ship', 'courier', 'charge', 'fee', 'how long', 'days', 'dhaka', 'outside', 'deliver', 'ডেলিভারি', 'চার্জ', 'কতদিন'],
    answer: `Delivery is **${taka(s.shippingFee)}** per order and **free on orders of ${taka(s.freeShippingThreshold)} or more**.\nWe confirm your order by phone, then hand it to our courier. Delivery time depends on your location — you can follow it on [My Orders](/orders).\nMore details: [Shipping & delivery](/pages/shipping)`,
  },
  {
    id: 'payment',
    question: 'How can I pay?',
    keywords: ['pay', 'payment', 'cash', 'cod', 'bkash', 'nagad', 'card', 'online', 'advance', 'পেমেন্ট', 'বিকাশ', 'ক্যাশ'],
    // A function: the answer depends on whether online payment is switched on.
    answer: ({ online }) => online
      ? `You can choose at checkout:\n- **Pay online** — bKash, Nagad, Rocket, Visa, Mastercard or internet banking, secured by SSLCommerz.\n- **Cash on Delivery** — pay the courier when your parcel arrives.`
      : `We currently take **Cash on Delivery** only — you pay the courier when your parcel arrives. No advance payment is needed.`,
  },
  {
    id: 'returns',
    question: 'Can I return or exchange?',
    keywords: ['return', 'exchange', 'refund', 'change size', 'wrong size', 'damaged', 'defect', 'replace', 'রিটার্ন', 'এক্সচেঞ্জ', 'ফেরত'],
    answer: `Yes — unworn, unwashed items with tags can be returned or exchanged within **${s.returnDays} days** of delivery.\nTo start, [contact us](/pages/contact) with your order number (it starts with CM-).\nFull policy: [Returns & exchanges](/pages/returns)`,
  },
  {
    id: 'track',
    question: 'Where is my order?',
    keywords: ['track', 'order status', 'where is my order', 'my order', 'status', 'shipped', 'not received', 'late', 'অর্ডার', 'কোথায়'],
    answer: `Open [Track your order](/track) and enter your order number (it starts with CM-) and the phone number you ordered with — no account needed.\nWith an account, all your orders are under [My Orders](/orders). If something looks wrong, message us with your order number.`,
  },
  {
    id: 'cancel',
    question: 'How do I cancel an order?',
    keywords: ['cancel', 'cancellation', 'change address', 'change order', 'বাতিল'],
    answer: `Orders that are still **Pending** or **Confirmed** (and not yet paid online) can be cancelled on [Track your order](/track) or [My Orders](/orders).\nIf it has already shipped, or you need to change the address, please contact us as soon as possible.`,
  },
  {
    id: 'size',
    question: 'Which size should I choose?',
    keywords: ['size', 'fit', 'measurement', 'chest', 'length', 'small', 'medium', 'large', 'xl', 'oversized', 'সাইজ', 'মাপ'],
    answer: `Each product page describes the fit and shows which sizes are in stock.\nNot sure which to pick? Send us your height, weight and usual size on WhatsApp and we'll recommend one. If it doesn't fit, you can [exchange it](/pages/returns).`,
  },
  {
    id: 'order',
    question: 'How do I place an order?',
    keywords: ['how to order', 'place order', 'buy', 'purchase', 'checkout', 'order kivabe', 'কিভাবে', 'কিনব'],
    answer: `1. Open a product, choose colour and size, and tap **Add to Cart** (or **Buy Now**).\n2. Go to the cart and **Checkout**.\n3. Enter your name, mobile number and address, then **Place order** — you pay cash on delivery.\nNo account needed — just your name, phone and address. You can also [create an account](/register) to see all your orders in one place.`,
  },
  {
    id: 'sale',
    question: 'Any offers or sale?',
    keywords: ['sale', 'offer', 'discount', 'deal', 'coupon', 'promo', 'cheap', 'অফার', 'ছাড়', 'ডিসকাউন্ট'],
    answer: `See everything currently discounted in our [Sale](/shop?sale=true).\nAlso check [New Arrivals](/shop?newArrivals=true) and [Best Sellers](/shop?bestSellers=true).`,
  },
  {
    id: 'contact',
    question: 'How can I contact you?',
    keywords: ['contact', 'phone', 'call', 'number', 'whatsapp', 'email', 'talk', 'human', 'agent', 'support', 'help', 'যোগাযোগ', 'নম্বর'],
    answer: `You can reach us on WhatsApp${s.whatsapp ? ` at **+${s.whatsapp}**` : ''} — tap **Talk to a person** below — or see our [Contact page](/pages/contact).`,
  },
  {
    id: 'account',
    question: 'Account & login help',
    keywords: ['account', 'login', 'log in', 'sign in', 'register', 'sign up', 'password', 'forgot', 'লগইন', 'একাউন্ট'],
    answer: `[Sign in here](/login) or [create an account](/register) — it takes a minute.\nForgot your password? Message us and we'll help you get back in.`,
  },
];

const GREETINGS = ['hi', 'hello', 'hey', 'salam', 'assalamu', 'হাই', 'হ্যালো', 'আসসালামু'];
const THANKS = ['thanks', 'thank you', 'thx', 'ধন্যবাদ'];

/** An FAQ's answer text; `ctx` carries runtime facts such as { online } for answers that depend on them. */
export function resolveAnswer(faq, ctx = {}) {
  return typeof faq.answer === 'function' ? faq.answer(ctx) : faq.answer;
}

/** Pick the best answer for a free-text message, or a fallback that offers a product search. */
export function answerFor(text, ctx = {}) {
  const t = text.toLowerCase().trim();
  const words = t.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

  if (THANKS.some(k => t.includes(k))) return { content: "You're welcome! Anything else I can help with?" };
  if (words.length <= 3 && GREETINGS.some(k => t.startsWith(k))) {
    return { content: 'Hello! Pick a question below or type your own.', showMenu: true };
  }

  let best = null, bestScore = 0;
  for (const f of FAQ) {
    let score = 0;
    for (const k of f.keywords) {
      if (k.includes(' ') ? t.includes(k) : words.includes(k) || (k.length > 4 && t.includes(k))) score += k.includes(' ') ? 2 : 1;
    }
    if (score > bestScore) { best = f; bestScore = score; }
  }
  if (best) return { content: resolveAnswer(best, ctx) };

  const clean = text.trim().replace(/[[\]()*]/g, '').slice(0, 40);
  const q = encodeURIComponent(clean);
  return {
    content: `Sorry, I don't have an answer for that yet.\n- Looking for a product? [Search for "${clean}"](/shop?q=${q})\n- Or message our team on WhatsApp — tap **Talk to a person** below.`,
    showMenu: true,
  };
}
