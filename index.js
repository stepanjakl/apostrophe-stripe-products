const fs = require('fs');
const path = require('path');
const _ = require('lodash');

/**
 * Deep diff between two object-likes
 * https://gist.github.com/Yimiprod/7ee176597fef230d1451?permalink_comment_id=4757803#gistcomment-4757803
 */
function deepDiff(fromObject, toObject) {
  const changes = {};
  const buildPath = (path, obj, key) => {
    const origVal = _.get(obj, key);
    if (_.isUndefined(path)) {
      if (_.isArray(origVal)) {
        changes[key] = [];
      } else if (_.isObject(origVal)) {
        changes[key] = {};
      }
    } else {
      if (_.isArray(origVal)) {
        path[key] = [];
      } else if (_.isObject(origVal)) {
        path[key] = {};
      }
    }
    return [ _.isUndefined(path) ? changes : path, key ];
  };
  const walk = (fromObject, toObject, path) => {
    for (const key of _.keys(fromObject)) {
      const objKeyPair = buildPath(path, fromObject, key);
      if (!_.has(toObject, key)) {
        objKeyPair[0][objKeyPair[1]] = { from: _.get(fromObject, key) };
      }
    }
    for (const [ key, to ] of _.entries(toObject)) {
      const isLast = _.has(fromObject, key);
      const objKeyPair = buildPath(path, fromObject, key);
      if (isLast) {
        const from = _.get(fromObject, key);
        if (!_.isEqual(from, to)) {
          if (_.isObjectLike(to) && _.isObjectLike(from)) {
            walk(from, to, objKeyPair[0][objKeyPair[1]]);
          } else {
            objKeyPair[0][objKeyPair[1]] = {
              __old: from,
              __new: to
            };
          }
        } else {
          delete objKeyPair[0][objKeyPair[1]];
        }
      } else {
        objKeyPair[0][objKeyPair[1]] = { to };
      }
    }
  };
  walk(fromObject, toObject);
  return changes;
}

_.mixin({ deepDiff });

const Stripe = require('stripe');
let stripe = null;

if (process.env.STRIPE_MOCK_TEST_MODE === 'true') {
  stripe = new Stripe('sk_test_xyz', {
    host: '127.0.0.1',
    protocol: 'http',
    port: 12111
  });
} else {
  stripe = Stripe(process.env.STRIPE_KEY);
}

module.exports = {
  options: {
    alias: 'stripeProducts',
    i18n: {
      ns: 'stripeProducts',
      browser: true
    }
  },
  bundle: {
    directory: 'modules',
    modules: getBundleModuleNames()
  },
  init(self) {
    /* TODO self.options.stripeKey = process.env.STRIPE_KEY || self.options.stripeKey; */

    const groupName = 'stripe';
    const itemsToAdd = [ 'stripe-products/product' ];

    const existingStripeGroup = self.apos.adminBar.groups.find(group => group.name === groupName);

    const newStripeGroup = {
      name: groupName,
      label: 'Stripe',
      items: itemsToAdd
    };

    if (existingStripeGroup) {
      existingStripeGroup.items = existingStripeGroup.items.concat(itemsToAdd);
    } else {
      self.apos.adminBar.groups.push(newStripeGroup);
    }
  },
  apiRoutes(self) {
    return {
      post: {
        // POST /api/v1/stripe-products/synchronize
        '/api/v1/stripe-products/synchronize': async function (req) {
          class ReportingHandler {
            constructor(reporting) {
              this.reporting = reporting;
              this.differenceResults = {};
            }

            recordDifferences(docToUpdate, product, price) {
              const differenceProductObject = _.deepDiff(docToUpdate.stripeProductObject, product);
              const differencePriceObject = product.default_price ? _.deepDiff(docToUpdate.stripePriceObject, price) : null;

              if (!_.isEmpty(differenceProductObject)) {
                this.differenceResults[docToUpdate._id] = {
                  stripeProductObject: {
                    difference: differenceProductObject
                  }
                };
              }
              if (!_.isEmpty(differencePriceObject)) {
                this.differenceResults[docToUpdate._id] = {
                  stripePriceObject: {
                    difference: differencePriceObject
                  }
                };
              }

              return {
                differenceProductObject,
                differencePriceObject
              };
            }

            setResults() {
              this.reporting.setResults(this.differenceResults);
            }

            async setTotalDocuments(req) {
              const totalDocs = await self.apos.stripeProduct.findForEditing(req.clone({ mode: 'draft' })).toCount();
              await this.reporting.setTotal(Math.floor(totalDocs / 2));
            }

            success() {
              this.reporting.success();
            }
          }

          if (req.user && self.apos.permission.can(req, 'create', 'stripe-products/product')) {

            let jobResolve, reporting;
            const jobPromise = new Promise((resolve, reject) => {
              jobResolve = resolve;
            });

            const job = await self.apos.modules['@apostrophecms/job'].run(req, async (req, r) => {
              reporting = r;
              await jobPromise;
            });

            const reportingHandler = new ReportingHandler(reporting);

            const getProductList = async (startingAfterId) => {
              try {
                return await stripe.products.list({
                  limit: 2,
                  starting_after: startingAfterId
                });
              } catch (error) {
                console.error(`Stripe API error: ${error.message}`);
                throw error;
              }
            };

            const getPriceInfo = async (product) => {
              if (product.default_price) {
                try {
                  const price = await stripe.prices.retrieve(product.default_price);
                  price.unit_amount = (price.unit_amount / 100).toFixed(2);
                  price.created_timestamp = new Date(price.created * 1000).toISOString();
                  return price;
                } catch (error) {
                  console.error(`Stripe API error: ${error.message}`);
                  throw error;
                }
              }
              return null;
            };

            const findDocToUpdate = async (req, product) => {
              return await self.apos.stripeProduct.findOneForEditing(req.clone({ mode: 'draft' }), {
                'stripeProductObject.id': product.id
              });
            };

            const updateDocument = async (req, docToUpdate, product, price) => {
              docToUpdate.stripeProductObject = product;
              docToUpdate.stripePriceObject = price;
              docToUpdate.archived = !product.active;
              docToUpdate.updatedAt = new Date();
              docToUpdate.stripeProductObject.created_timestamp = new Date(product.created * 1000).toISOString();
              docToUpdate.stripeProductObject.updated_timestamp = new Date(product.updated * 1000).toISOString();
              await self.apos.stripeProduct.update(req, docToUpdate);

              if (!docToUpdate.archived) {
                await self.apos.stripeProduct.publish(req, docToUpdate);
              }
            };

            const insertDocument = async (req, product, price) => {
              const stripeProductInstance = self.apos.stripeProduct.newInstance();
              stripeProductInstance.title = product.name;
              stripeProductInstance.slug = self.apos.util.slugify(product.name);
              stripeProductInstance.stripeProductObject = product;
              stripeProductInstance.stripePriceObject = price;
              stripeProductInstance.archived = !product.active;
              stripeProductInstance.stripeProductObject.created_timestamp = new Date(product.created * 1000).toISOString();
              stripeProductInstance.stripeProductObject.updated_timestamp = new Date(product.updated * 1000).toISOString();
              await self.apos.stripeProduct.insert(req, stripeProductInstance);
            };

            const handlePaginationAndSync = async (req) => {
              let productList = [];
              let startingAfterId;

              while (true) {
                const products = await getProductList(startingAfterId);
                productList = [ ...productList, ...products.data ];

                for (const product of products?.data || []) {
                  try {
                    const price = await getPriceInfo(product);
                    const docToUpdate = await findDocToUpdate(req, product);

                    if (docToUpdate) {
                      const {
                        differenceProductObject,
                        differencePriceObject
                      } = reportingHandler.recordDifferences(docToUpdate, product, price);

                      if (!_.isEmpty(differenceProductObject) || !_.isEmpty(differencePriceObject)) {
                        await updateDocument(req, docToUpdate, product, price);
                      }
                    } else {
                      await insertDocument(req, product, price);
                    }
                  } catch (error) {
                    console.error('Error occurred while processing product:', product.id, error);
                  }
                }

                startingAfterId = products.data.length > 0 ? products.data[products.data.length - 1].id : undefined;
                reportingHandler.success();

                if (!products.has_more) {
                  reportingHandler.setResults();
                  jobResolve();
                  return {
                    job,
                    productList,
                    differenceResults: reportingHandler.differenceResults
                  };
                }
              }
            };

            await reportingHandler.setTotalDocuments(req);

            return await handlePaginationAndSync(req);
          }
        }
      }
    };
  }
};

function getBundleModuleNames() {
  return fs.readdirSync(path.resolve(__dirname, 'modules')).reduce((result, dir) => {
    if (dir.includes('stripe') && !(/\.[^/.]/g).test(dir)) {
      const subdirectories = fs.readdirSync(path.resolve(__dirname, `modules/${dir}`));
      subdirectories.forEach((subdir) => {
        if (!(/\.[^/.]/g).test(subdir)) {
          result.push(`${dir}/${subdir}`);
        } else if (subdir === 'index.js') {
          result.push(dir);
        }
      });
    }
    return result;
  }, []);
}
