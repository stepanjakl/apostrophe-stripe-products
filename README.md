<div align="center">
    <h1>
        Stripe Products For ApostropheCMS
    </h1>
    <p>
        <a aria-label="Apostrophe logo" href="https://v3.docs.apostrophecms.org">
            <img src="https://img.shields.io/badge/MADE%20FOR%20APOSTROPHECMS-000000.svg?style=for-the-badge&logo=Apostrophe&labelColor=6516DD">
        </a>
        <a aria-label="Stripe logo" href="https://stripe.com">
            <img src="https://img.shields.io/badge/STRIPE-000000.svg?style=for-the-badge&logo=Stripe&labelColor=635bFF&logoColor=FFFFFF">
        </a>
        <br>
        <a aria-label="Personal logo" href="https://stepanjakl.com">
            <img src="https://img.shields.io/badge/STEPANJAKL.COM%20-000000.svg?style=for-the-badge&labelColor=EED500&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+PHBhdGggZmlsbD0iIzAwMDAwMCIgZD0iTTAgMTV2NWgyMFY3LjVIMHY1aDE1LjA1VjE1SDBaTTIwIDBIMHY1aDIwVjBaIiAvPjwvc3ZnPg==">
        </a>
        <a aria-label="License"
           href="https://github.com/apostrophecms/module-template/blob/main/LICENSE.md">
            <img alt="License"
                 src="https://img.shields.io/static/v1?style=for-the-badge&labelColor=000000&label=License&message=MIT&color=3DA639">
        </a>
        <br>
        <br>
        <a aria-label="Unit Tests"
           href="https://github.com/stepanjakl/apostrophe-stripe-products/actions/workflows/tests.yml">
            <img alt="Unit Tests"
                 src="https://github.com/stepanjakl/apostrophe-stripe-products/actions/workflows/tests.yml/badge.svg?branch=main">
        </a>
    </p>
</div>

<br>

This module adds a piece module and utility operation to automatically synchronize Stripe Products with the database. Saved products can be easily accessed and viewed via the admin UI alongside other piece methods and features, including the built-in REST API.

<br>

<table>
    <tr>
        <td colspan="3"><a href="./public/images/admin-1.png"><img src="./public/images/admin-1.png" alt="Admin UI 1"></a></td>
    </tr>
    <tr>
        <td><a href="./public/images/admin-2.png"><img src="./public/images/admin-2.png" alt="Admin UI 2"></a></td>
        <td><a href="./public/images/admin-3.png"><img src="./public/images/admin-3.png" alt="Admin UI 3"></a></td>
        <td><a href="./public/images/admin-4.png"><img src="./public/images/admin-4.png" alt="Admin UI 4"></a></td>
    </tr>
</table>

<br>

## Installation

Use your preferred package manager to install the module. You'll also need to install the [`read-only-field`](https://github.com/stepanjakl/apostrophe-read-only-field) package alongside it:

```zsh
npm install stripe-products@npm:@stepanjakl/apostrophe-stripe-products

npm install read-only-field@npm:@stepanjakl/apostrophe-read-only-field
```

<br>

## Examples

It is highly recommended to explore the [`apostrophe-stripe-examples`](https://github.com/stepanjakl/apostrophe-stripe-examples) repository, which offers a comprehensive set of examples and full configurations demonstrating how to set up a complete e-commerce store experience.

<br>

## Usage

First, add installed modules to your configuration in the `app.js` root file:

```js
require('apostrophe')({
    shortName: 'project-name',
    modules: {
        // Custom fields
        'read-only-field': {},

        // Stripe Products
        'stripe-products': {},
        'stripe-products/product': {}
    }
});
```

<br>

Then, set global variables inside the `.env` file. It's important to set the `STRIPE_TEST_MODE` variable to anything other than `false` to enable [test mode](https://docs.stripe.com/).

```js
PORT='4000'
APOS_BASE_URL='http://localhost:4000'
APOS_RELEASE_ID='a4-boilerplate'
APOS_MONGODB_URI='mongodb://localhost:27017/a4-boilerplate'

STRIPE_KEY='sk_test_xyz'
STRIPE_TEST_MODE='false'
STRIPE_DASHBOARD_BASE_URL='https://dashboard.stripe.com'
```

<br>

## Recommended use

This module is utilized to primarily mirror datasets fetched from the connected Stripe account. To enhance the front-end with additional custom data, it is recommended to create a separate piece type and link it to the Stripe product piece using a `relationship` schema field type. This enables the addition of extra schema fields for images, supporting documents, and other necessary data while keeping it decoupled from Stripe's data, which may change during synchronization.

```js
module.exports = {
  extend: 'apostrophe-pieces',
  name: 'product',
  fields: {
    add: {
      _stripeProduct: {
        label: 'Stripe Product',
        type: 'relationship',
        withType: 'stripe-products/product',
        max: 1
      },
      _images: {
        label: 'Images',
        type: 'relationship',
        withType: '@apostrophecms/image'
      },
      _documents: {
        label: 'Documents',
        type: 'relationship',
        withType: '@apostrophecms/file'
      }
    }
  }
}
```

## API Routes

#### `'/api/v1/stripe-products/synchronize'`:

This API route is triggered by the `Synchronize Products` utility operation and handled via the `'@apostrophecms/job'` module. Upon execution, it compares the existing data with the received data and records the differences in the results object within the `aposJobs` collection document. Access to this endpoint is restricted to authenticated users with appropriate permissions.

<br>

#### `'/api/v1/stripe-products/product'`:

Apostrophe provides a pre-configured REST endpoint to retrieve a list of all available products. Below is an example of how to use the Fetch API with error handling directly in the browser:

```javascript
try {
  const response = await fetch('/api/v1/stripe-products/product');
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  const { results: products } = await response.json();

  products.forEach(product => {
    console.log('Product Name:', product.stripeProductObject.name);
  });

} catch (error) {
  console.error('Error fetching products:', error);
}
```

<br>

## Unit Tests

To run tests locally, you'll need to set up the [`stripe/stripe-mock`](https://github.com/stripe/stripe-mock) package:

```zsh
brew install stripe/stripe-mock/stripe-mock

brew services start stripe-mock
```

<br>

Once set up, run tests using `npm run tests` to validate any changes before deploying them.

<br>

## TODOs (Improvements)

- fix disappering `stripeProductObject` and `stripePriceObject` data when moved between `draft` and `published` modes and vice versa
- optional product piece type REST API or configurable schema fields
- automatic synchronization on product catalog changes with global schema field to enable
- two-way synchronization between ApostropheCMS and Stripe
