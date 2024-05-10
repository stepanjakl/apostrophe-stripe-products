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
    user.email = 'ad@min.com';
    user.role = 'admin';

    await apos.user.insert(apos.task.getReq(), user);
  });

  it('should log in as admin and make a GET request to establish CSRF cookie', async function() {
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

  /* it('should send request to webhook endpoint and save the completed checkout session to the database', async function () {

    await apos.http.post('/api/v1/stripe/checkout/webhook', {
      headers: {
        'stripe-signature': 't=1711059559,v1=9dd216ac7ffc2d07d3edd4b4de4a67200705c52f435e92bc3b21a605f3af91af,v0=4251a0f2bbd73dd1622bb01aedb334cab148be2a84bb3b1daea4af931e0172e2'
      },
      body: {
        id: 'evt_xyz',
        object: 'event'
      }
    }).catch(error => {
      console.error('An error occurred:', error);
      throw error;
    });

    const sessionDoc = await apos.stripeCheckoutSession.find(apos.task.getReq(), {
      slug: 'cs_xyz',
      aposMode: 'published'
    }).toObject();

    assert(sessionDoc);
  }); */
});
