<div align="center">
    <h1>
        Stripe Products For ApostropheCMS
    </h1>
    <p>
        <a aria-label="Apostrophe logo" href="https://v3.docs.apostrophecms.org">
            <img src="https://img.shields.io/badge/MADE%20FOR%20APOSTROPHECMS-000000.svg?style=for-the-badge&logo=Apostrophe&labelColor=6516dd">
        </a>
        <a aria-label="Personal logo" href="https://stepanjakl.com">
            <img src="https://img.shields.io/badge/STEPANJAKL.COM%20-000000.svg?style=for-the-badge&labelColor=EED500&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+PHBhdGggZmlsbD0iIzAwMDAwMCIgZD0iTTAgMTV2NWgyMFY3LjVIMHY1aDE1LjA1VjE1SDBaTTIwIDBIMHY1aDIwVjBaIiAvPjwvc3ZnPg==">
        </a>
        <a aria-label="License"
           href="https://github.com/apostrophecms/module-template/blob/main/LICENSE.md">
            <img alt="License"
                 src="https://img.shields.io/static/v1?style=for-the-badge&labelColor=000000&label=License&message=MIT&color=3DA639">
        </a>
    </p>
</div>

<br>

This module adds a piece module and utility operation to automatically synchronise Stripe Products with the database. Saved products can be easily accessed anv viewed via the admin UI.

<br>

<table>
<tr>
<td colspan="4"><a href="./public/images/checkout.png" target="_blank"><img src="./public/images/checkout.png" alt="Checkout"></a></td>
</tr>
  <tr>
    <td><a href="./public/images/admin-1.png"><img src="./public/images/admin-1.png" alt="Admin UI 1"></a></td>
    <td><a href="./public/images/admin-2.png"><img src="./public/images/admin-2.png" alt="Admin UI 2"></a></td>
    <td><a href="./public/images/admin-3.png"><img src="./public/images/admin-3.png" alt="Admin UI 3"></a></td>
    <td><a href="./public/images/admin-4.png"><img src="./public/images/admin-4.png" alt="Admin UI 4"></a></td>
  </tr>
</table>

<br>

## Installation

Use your preferred package manager to install the module. You'll also need to install the [read-only-field](https://github.com/) package alongside it:

```zsh
npm install stripe-products@npm:@stepanjakl/apostrophe-stripe-products

npm install read-only-field@npm:@stepanjakl/apostrophe-read-only-field
```

<br>

## Examples

**It is highly recommended to explore the [stripe-examples](https://github.com/) repository, which offers a comprehensive set of examples and full configurations demonstrating how to set up a complete e-commerce store experience.**

<br>

## Usage

First, add installed modules to your configuration in the `app.js` root file:

```js
require('apostrophe')({
  shortName: 'project-name',
  modules: {
    'read-only-field': {},
    'stripe-products': {}
  }
});
```

Then, set global variables inside the `.env` file. It's important to set the `STRIPE_TEST_MODE` variable to anything other than `false` to enable [test mode](https://docs.stripe.com/test-mode).

```dotenv
PORT='4000'
APOS_BASE_URL='http://localhost:4000'
APOS_RELEASE_ID='a4-boilerplate'
APOS_MONGODB_URI='mongodb://localhost:27017/a4-boilerplate'

STRIPE_KEY='sk_test_xyz'
STRIPE_TEST_MODE='false'
STRIPE_DASHBOARD_BASE_URL='https://dashboard.stripe.com'
```

<br>

## API Routes

The `stripe-products` module has one custom API route that is triggered via the `Synchrnize Products` operation utility:

<br>

#### `'/api/v1/stripe-products/synchronize'`:

This API route handles POST requests to create a new [Stripe Checkout Session](https://docs.stripe.com/payments/checkout/how-checkout-works). It is a central piece of the module and facilitates initiating payment transactions through Stripe. Here's an example of a request using the Fetch API:

```javascript
const requestOptions = {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    line_items: [
      {
        price: 'price_test_abc',
        quantity: 2
      },
      {
        price: 'price_test_xyz',
        quantity: 1
      }
    ],
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel'
  })
};

fetch('/api/v1/stripe/checkout/sessions/create', requestOptions)
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }
    return response.json();
  })
  .then(data => {
    // Handle the response data, e.g., redirect to the checkout URL
    const checkoutUrl = data.url;
    console.log('Checkout URL:', checkoutUrl);
    // Example: Redirecting to the checkout URL
    window.location.href = checkoutUrl;
  })
  .catch(error => {
    console.error('Error:', error);
    // Handle errors, e.g., show an error message to the user
  });
```

<br>

#### `'/api/v1/stripe/checkout/webhook'`:

This API route is used by the local listener to receive asynchronous Stripe events and save the completed checkout session to the database.

Set up event forwarding with the CLI and send all Stripe events to your local webhook endpoint for testing purposes:

```shell
stripe listen --forward-to localhost:5000/api/v1/stripe/checkout/webhook
```

Use the PM2 process manager to run the `listen` command in production:

```shell
pm2 start --name stripe-listener "stripe listen --events checkout.session.completed --forward-to localhost:5000/api/v1/stripe/checkout/webhook"
```

[Read more about the Stripe webhooks](https://docs.stripe.com/webhooks/quickstart)

<br>

## TODOs (Limitations)

- Option for one-time and recurring payments
- Enable checkout session with more than 99 items
- Add other extra checkout session options (e.g. custom styles)
