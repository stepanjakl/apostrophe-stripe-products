const assert = require('assert');
const t = require('apostrophe/test-lib/test');

process.env.STRIPE_WEBHOOK_ENDPOINT_SECRET = 'whsec_xyz';
process.env.STRIPE_TEST_MODE = 'true';

describe('Apostrophe - Stripe Products Integration Tests', function () {
  let apos;
  let jar;

  this.timeout(t.timeout);

  after(async function () {
    await t.destroy(apos);
  });

  before(async function () {
    apos = await t.create({
      baseUrl: 'http://localhost:7770',
      modules: {
        '@apostrophecms/page': {
          options: {
            types: [
              {
                name: '@apostrophecms/home-page',
                label: 'Home'
              }
            ]
          }
        },
        'read-only-field': {},
        'stripe-products': {},
        'stripe-products/product': {}
      }
    });
  });

  it('should properly instantiate the read-only field module', function () {
    assert(apos.readOnlyField, 'ReadOnlyField module should be properly instantiated');
  });

  it('should properly instantiate the products and product piece type modules', function () {
    assert(apos.stripeProducts, 'Stripe Products module should be properly instantiated');
    assert(apos.stripeProduct, 'Stripe Product piece type module should be properly instantiated');
  });

  it('should be able to insert a test admin user', async function() {
    assert(apos.user.newInstance, 'New instance of User should be available');
    const user = apos.user.newInstance();
    assert(user, 'User instance should be created successfully');

    user.title = 'admin';
    user.username = 'admin';
    user.password = 'admin';
    user.email = 'admin@example.com';
    user.role = 'admin';

    await apos.user.insert(apos.task.getReq(), user);

    const insertedUser = await apos.user.find(apos.task.getReq(), { username: 'admin' }).toObject();
    assert(insertedUser, 'Admin user should be inserted successfully');
    assert.strictEqual(insertedUser.username, 'admin', 'Username of inserted user should match');
    assert.strictEqual(insertedUser.email, 'admin@example.com', 'Email of inserted user should match');
    assert.strictEqual(insertedUser.role, 'admin', 'Role of inserted user should be admin');
  });

  it('should log in as admin and establish a CSRF cookie with a GET request', async function() {
    jar = apos.http.jar();

    let page = await apos.http.get('/', { jar });

    assert(page.match(/logged out/), 'Should detect that the user is logged out');

    await apos.http.post('/api/v1/@apostrophecms/login/login', {
      body: {
        username: 'admin',
        password: 'admin',
        session: true
      },
      jar
    });

    page = await apos.http.get('/', { jar });

    assert(page.match(/logged in/), 'Should detect that the user is logged in');
  });

  it('should connect to Stripe API', async function() {
    const Stripe = require('stripe');
    const stripe = new Stripe('sk_test_xyz', {
      host: '127.0.0.1',
      protocol: 'http',
      port: 12111,
      maxNetworkRetries: 3,
      timeout: 10 * 1000
    });

    try {
      const paymentMethods = await stripe.paymentMethods.list({ limit: 1 });
      assert.strictEqual(paymentMethods.data.length > 0, true, 'Should connect to Stripe API successfully');
    } catch (error) {
      console.error('Error connecting to Stripe API:', error);
      if (error.detail?.errors?.length > 0) {
        console.error('Error detail:', ...error.detail.errors);
      }
      throw error;
    }
  });

  it('should synchronize products and save them to the database', async function () {
    let response;

    try {
      response = await apos.http.post('/api/v1/stripe-products/synchronize', {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        jar
      });
    } catch (error) {
      console.error('An error occurred:', error);
      throw error;
    }

    assert.strictEqual(Object.keys(response.job)[0] === 'jobId', true, 'Job ID should exist in the response');
    assert.strictEqual(response.productList.length > 0, true, 'Product list should not be empty in the response');
  });

  it('should retrieve both draft and published version of the product from the database', async function () {
    const assert = require('assert');

    const products = await apos.doc.db.find({ type: /product/i }).toArray();

    let hasDraft = false;
    let hasPublished = false;

    products.forEach(product => {
      if (product._id.includes(':draft')) {
        hasDraft = true;
      } else if (product._id.includes(':published')) {
        hasPublished = true;
      }
    });

    assert.strictEqual(hasDraft, true, 'At least one draft product should exist');
    assert.strictEqual(hasPublished, true, 'At least one published product should exist');
  });

  it('should retrieve products via REST API using a GET request', async function () {
    let response;

    try {
      response = await apos.http.get('/api/v1/stripe-products/product', {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('An error occurred:', error);
      throw error;
    }

    assert.strictEqual(response.results.length > 0, true, 'At least one product should be retrieved via REST API');
  });
});
