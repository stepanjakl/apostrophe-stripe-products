const fs = require('fs');
const path = require('path');
const _ = require('lodash');

/**
 * Deep diff between two object-likes
 * https://gist.github.com/Yimiprod/7ee176597fef230d1451?permalink_comment_id=4757803#gistcomment-4757803
 * @param  {Object} fromObject the original object
 * @param  {Object} toObject   the updated object
 * @return {Object}            a new object which represents the difference
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
const stripe = Stripe(process.env.STRIPE_KEY);

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
    const groupName = 'stripe';
    const itemsToAdd = [ 'stripe-products/product' ];

    // Check if 'stripe' already exists in self.apos.adminBar.groups
    const existingStripeGroup = self.apos.adminBar.groups.find(group => group.name === groupName);

    const newStripeGroup = {
      name: groupName,
      label: 'Stripe',
      items: itemsToAdd
    };

    // If 'stripe' exists, add items to the existing one; otherwise, create a new group
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
          if (req.user && (req.user.role === 'editor' || req.user.role === 'admin')) {
            return self.apos.modules['@apostrophecms/job'].run(req, async (req, reporting) => {
              // Set total for reporting based on the existing collection documents
              reporting.setTotal(Math.round(await self.apos.stripeProduct.find(req).toCount() / 4));
              const differenceResults = {};
              let startingAfterId;

              while (true) {
                // Fetch products from Stripe
                const productList = await stripe.products.list({
                  active: true,
                  limit: 2,
                  starting_after: startingAfterId
                });

                for (const product of productList?.data || []) {
                  product.created_timestamp = new Date(product.created * 1000).toISOString();
                  product.updated_timestamp = new Date(product.updated * 1000).toISOString();

                  // Check if the document exists in the database
                  const docsToUpdate = await self.apos.doc.db.find({ 'stripeProductObject.id': product.id }).toArray();
                  const price = product.default_price ? await stripe.prices.retrieve(product.default_price) : null;

                  if (product.default_price && price) {
                    price.unit_amount = (price.unit_amount / 100).toFixed(2);
                    price.created_timestamp = new Date(price.created * 1000).toISOString();
                  }

                  if (docsToUpdate.length > 0) {
                    for (const docToUpdate of docsToUpdate) {
                      // Calculate differences in product and price objects
                      const differenceProductObject = _.deepDiff(docToUpdate.stripeProductObject, product);
                      const differencePriceObject = product.default_price ? _.deepDiff(docToUpdate.stripePriceObject, price) : null;

                      // Update the document if differences are found
                      if (!_.isEmpty(differenceProductObject) || !_.isEmpty(differencePriceObject)) {
                        // Update the document with the new product and price objects
                        await self.apos.doc.db.updateOne(
                          { _id: docToUpdate._id },
                          {
                            $set: {
                              stripeProductObject: product,
                              stripePriceObject: price
                            }
                          },
                          { upsert: true }
                        );

                        // Include 'difference' objects only if they are not empty
                        if (!_.isEmpty(differenceProductObject)) {
                          differenceResults[docToUpdate._id] = { stripeProductObject: { difference: differenceProductObject } };
                        }
                        if (!_.isEmpty(differencePriceObject)) {
                          differenceResults[docToUpdate._id] = { stripePriceObject: { difference: differencePriceObject } };
                        }
                      }
                    }
                  } else {
                    // Insert a new document if it doesn't exist
                    const stripeProductInstance = self.apos.stripeProduct.newInstance();
                    stripeProductInstance.title = product.name;
                    stripeProductInstance.slug = self.apos.util.slugify(product.name);
                    stripeProductInstance.stripeProductObject = product;
                    stripeProductInstance.stripePriceObject = product.default_price ? price : null;

                    await self.apos.stripeProduct.insert(req, stripeProductInstance);
                  }
                }

                // Update startingAfterId for the next request
                startingAfterId = productList.data.length > 0 ? productList.data[productList.data.length - 1].id : undefined;

                // Check if there are more products to fetch
                if (!productList.has_more) {
                  // Finalize the job and pass doc changes to the results field
                  reporting.setResults(differenceResults);
                  reporting.success();
                  break;
                }
              }
            });
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
