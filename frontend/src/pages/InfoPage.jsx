import { Link, useParams } from 'react-router-dom';
import { siteInfo as s } from '../siteInfo';
import NotFoundPage from './NotFoundPage';
import './InfoPage.css';

const money = (n) => `৳${n.toLocaleString('en-US')}`;

function ContactDetails() {
  const rows = [
    s.email && ['Email', <a href={`mailto:${s.email}`}>{s.email}</a>],
    s.phone && ['Phone', <a href={`tel:${s.phone.replace(/\s/g, '')}`}>{s.phone}</a>],
    s.whatsapp && ['WhatsApp', <a href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noreferrer">Message us</a>],
    s.facebook && ['Facebook', <a href={s.facebook} target="_blank" rel="noreferrer">Send a message</a>],
    s.instagram && ['Instagram', <a href={s.instagram} target="_blank" rel="noreferrer">Follow us</a>],
    s.address && ['Visit', s.address],
    s.hours && ['Hours', s.hours],
  ].filter(Boolean);

  return (
    <>
      <p>Questions about sizing, an order or a return? We're happy to help.</p>
      {rows.length > 0 && (
        <dl className="contact-list">
          {rows.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      )}
      <h2>About an existing order</h2>
      <p>Sign in and open <Link to="/orders">My Orders</Link> to see the status of every order. Please have your order number (it starts with <strong>CM-</strong>) ready when you contact us.</p>
    </>
  );
}

const PAGES = {
  about: {
    title: 'About CoreMan',
    lead: 'Premium everyday clothing, made to be worn hard and washed often.',
    body: () => (
      <>
        <p>CoreMan started with a simple idea: the pieces you reach for every day deserve the most care. We focus on heavyweight cotton, considered fits and colours that work together, so building a wardrobe is easy.</p>
        <h2>What we make</h2>
        <p>Our first collection is built around the drop-shoulder tee — boxy, relaxed and cut from dense cotton that holds its shape. We're growing the range one category at a time, and only add a piece when we're happy with the fabric and the fit.</p>
        <h2>How we sell</h2>
        <p>We sell online across Bangladesh, with prices in Taka, Cash on Delivery on every order and free shipping on orders over {money(s.freeShippingThreshold)}.</p>
        <p><Link to="/shop" className="btn btn-primary">Shop the collection</Link></p>
      </>
    ),
  },
  contact: { title: 'Contact us', body: ContactDetails },
  shipping: {
    title: 'Shipping & delivery',
    body: () => (
      <>
        <h2>Shipping charges</h2>
        <table className="info-table">
          <tbody>
            <tr><th>Orders of {money(s.freeShippingThreshold)} or more</th><td>Free</td></tr>
            <tr><th>Orders under {money(s.freeShippingThreshold)}</th><td>{money(s.shippingFee)}</td></tr>
          </tbody>
        </table>
        <h2>How delivery works</h2>
        <ol>
          <li>Place your order and choose Cash on Delivery.</li>
          <li>We confirm the order — usually by phone — and pack it.</li>
          <li>Your parcel is handed to our courier partner and the order status changes to <strong>Shipped</strong>.</li>
          <li>Pay the courier in cash when the parcel arrives.</li>
        </ol>
        <p>Delivery time depends on your location. You can follow every order from <Link to="/orders">My Orders</Link>.</p>
        <h2>Need to change your address?</h2>
        <p>Contact us before the order is shipped and we'll update it. Orders that are still <strong>Pending</strong> or <strong>Confirmed</strong> can also be cancelled from My Orders.</p>
      </>
    ),
  },
  returns: {
    title: 'Returns & exchanges',
    body: () => (
      <>
        <p>Not the right fit? You can return or exchange unworn items within {s.returnDays} days of delivery.</p>
        <h2>Conditions</h2>
        <ul>
          <li>Items must be unworn, unwashed and have their original tags attached.</li>
          <li>Please include your order number with the return.</li>
        </ul>
        <h2>How to start a return</h2>
        <ol>
          <li><Link to="/pages/contact">Contact us</Link> with your order number and the item(s) you'd like to return or exchange.</li>
          <li>We'll confirm and arrange the pickup or drop-off.</li>
          <li>Once we receive and check the item, we'll send your exchange or arrange your refund.</li>
        </ol>
        <h2>Faulty or wrong item?</h2>
        <p>If something arrives damaged or isn't what you ordered, let us know as soon as possible and we'll put it right at no cost to you.</p>
      </>
    ),
  },
  privacy: {
    title: 'Privacy policy',
    body: () => (
      <>
        <p>This policy explains what information {s.name} collects and how it's used.</p>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account details</strong> — your name, email address and password (stored only as a secure hash).</li>
          <li><strong>Delivery details</strong> — recipient name, phone number and address, so we can deliver your order.</li>
          <li><strong>Order history</strong> — what you bought and when.</li>
          <li><strong>Wishlist and reviews</strong> — items you save and reviews you choose to publish. Reviews show your first name and last initial.</li>
        </ul>
        <p>We don't collect or store card details: orders are paid by Cash on Delivery.</p>
        <h2>How we use it</h2>
        <ul>
          <li>To process, deliver and support your orders.</li>
          <li>To keep you signed in. Your login session is stored in your browser.</li>
          <li>To share your name, phone and address with our courier partner for delivery — and for nothing else.</li>
        </ul>
        <p>We don't sell your personal information.</p>
        <h2>Your choices</h2>
        <p>You can ask us to correct or delete your account and personal data at any time — <Link to="/pages/contact">contact us</Link>.</p>
      </>
    ),
  },
  terms: {
    title: 'Terms of service',
    body: () => (
      <>
        <p>By using this website and placing an order you agree to these terms.</p>
        <h2>Orders</h2>
        <ul>
          <li>All prices are in Bangladeshi Taka (BDT) and include any applicable taxes.</li>
          <li>An order is accepted once we confirm it. We may cancel an order if an item is out of stock, the price was listed in error, or we can't reach you to confirm delivery.</li>
          <li>Product colours may look slightly different on screen.</li>
        </ul>
        <h2>Payment</h2>
        <p>Orders are paid in cash to the courier on delivery. Please have the exact amount shown on your order ready.</p>
        <h2>Shipping and returns</h2>
        <p>See our <Link to="/pages/shipping">Shipping</Link> and <Link to="/pages/returns">Returns</Link> pages.</p>
        <h2>Your account</h2>
        <p>Keep your password private. You're responsible for orders placed from your account.</p>
        <h2>Changes</h2>
        <p>We may update these terms from time to time. The version on this page applies to orders placed while it's shown.</p>
      </>
    ),
  },
};

export default function InfoPage() {
  const { slug } = useParams();
  const page = PAGES[slug];
  if (!page) return <NotFoundPage />;
  const Body = page.body;

  return (
    <div className="page container info-page">
      <h1 className="page-title">{page.title}</h1>
      {page.lead && <p className="info-lead">{page.lead}</p>}
      <div className="info-body"><Body /></div>
    </div>
  );
}
