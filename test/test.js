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
    assert(apos.readOnlyField);
  });

  it('should properly instantiate the products and product piece type modules', function () {
    assert(apos.stripeProducts);
    assert(apos.stripeProduct);
  });

  it('should be able to insert a test admin user', async function() {
    assert(apos.user.newInstance);
    const user = apos.user.newInstance();
    assert(user);

    user.title = 'admin';
    user.username = 'admin';
    user.password = 'admin';
    user.email = 'admin@example.com';
    user.role = 'admin';

    await apos.user.insert(apos.task.getReq(), user);
  });

  it('should log in as admin and establish a CSRF cookie with a GET request', async function() {
    jar = apos.http.jar();

    let page = await apos.http.get('/', { jar });

    assert(page.match(/logged out/));

    await apos.http.post('/api/v1/@apostrophecms/login/login', {
      body: {
        username: 'admin',
        password: 'admin',
        session: true
      },
      jar
    });

    page = await apos.http.get('/', { jar });

    assert(page.match(/logged in/));
  });

  it('should connect to Stripe API', async function() {
    const Stripe = require('stripe');
    const stripe = new Stripe('sk_test_xyz', {
      host: 'localhost',
      protocol: 'http',
      port: 12111
    });

    try {
      const paymentMethods = await stripe.paymentMethods.list({ limit: 1 });
      assert.strictEqual(paymentMethods.data.length > 0, true);
    } catch (error) {
      console.error('Error connecting to Stripe API:', error);
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

    assert.strictEqual(Object.keys(response.job)[0] === 'jobId', true);
    assert.strictEqual(response.productList.length > 0, true);
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

    assert.strictEqual(response.results.length > 0, true);
  });
});
