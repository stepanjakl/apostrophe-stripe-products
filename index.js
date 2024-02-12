const fs = require('fs')
const path = require('path')
const _ = require('lodash')

const Stripe = require('stripe')
const stripe = Stripe(process.env.STRIPE_KEY)

// Use body-parser to retrieve the raw body as a buffer
/* const bodyParser = require('body-parser')

const stripeWebhookEnpoint = '/api/v1/stripe/checkout/webhook' */

module.exports = {
    options: {
        alias: 'stripeProducts',
        i18n: {
            ns: 'stripeProducts',
            browser: true
        },
        /* csrfExceptions: [stripeWebhookEnpoint] */
    },
    bundle: {
        directory: 'modules',
        modules: getBundleModuleNames()
    },
    init(self) {
        const groupName = 'stripe'
        const itemsToAdd = ['stripe-products/product']

        // Check if 'stripe' already exists in self.apos.adminBar.groups
        const existingStripeGroup = self.apos.adminBar.groups.find(group => group.name === groupName)

        const newStripeGroup = {
            name: groupName,
            label: 'Stripe',
            items: itemsToAdd
        }

        // If 'stripe' exists, add items to the existing one; otherwise, create a new group
        if (existingStripeGroup) {
            existingStripeGroup.items = existingStripeGroup.items.concat(itemsToAdd)
        } else {
            self.apos.adminBar.groups.push(newStripeGroup)
        }
    },
    apiRoutes(self) {
        return {
            post: {
                // POST /api/v1/stripe/products/synchronize
                '/api/v1/stripe/products/synchronize': async function (req, options) {
                    console.log('-- -- API -- Stripe Products - Synchronize')
                    console.log('-- -- API -- Stripe Products - Synchronize - options:', options)
                    console.log('-- -- API -- Stripe Products - Synchronize - req.body:', req.body)

                    async function delay(ms) {
                        // return await for better async stack trace support in case of errors.
                        return await new Promise(resolve => setTimeout(resolve, ms))
                    }

                    /* jobThree = await jobModule.run(
                        req,
                        async function(req, reporters) {
                          let count = 1;
                          reporters.setTotal(articleIds.length);

                          for (const id of articleIds) {
                            await Promise.delay(3);
                            logged.push(id);
                            if (count % 2) {
                              reporters.success();
                            } else {
                              reporters.failure();
                            }
                            count++;
                          }
                        }
                      ) */

                    /**
                     * Deep diff between two object-likes
                     * @param  {Object} fromObject the original object
                     * @param  {Object} toObject   the updated object
                     * @return {Object}            a new object which represents the difference
                     */
                    function deepDiff(fromObject, toObject) {
                        const changes = {}

                        const buildPath = (path, obj, key) =>
                            _.isUndefined(path) ? key : `${path}.${key}`

                        const walk = (fromObject, toObject, path) => {
                            for (const key of _.keys(fromObject)) {
                                const currentPath = buildPath(path, fromObject, key)
                                if (!_.has(toObject, key)) {
                                    changes[currentPath] = { from: _.get(fromObject, key) }
                                }
                            }

                            for (const [key, to] of _.entries(toObject)) {
                                const currentPath = buildPath(path, toObject, key)
                                if (!_.has(fromObject, key)) {
                                    changes[currentPath] = { to }
                                } else {
                                    const from = _.get(fromObject, key)
                                    if (!_.isEqual(from, to)) {
                                        if (_.isObjectLike(to) && _.isObjectLike(from)) {
                                            walk(from, to, currentPath)
                                        } else {
                                            changes[currentPath] = { from, to }
                                        }
                                    }
                                }
                            }
                        }

                        walk(fromObject, toObject)

                        return changes
                    }

                    _.mixin({ deepDiff })

                    return self.apos.modules['@apostrophecms/job'].run(
                        req,
                        async (req, reporting) => {

                            reporting.setTotal(Math.round(await self.apos.stripeProduct.find(req).toCount() / 2))

                            let hasMoreProducts = true
                            let startingAfterId = undefined
                            let differenceResults = {}

                            while (hasMoreProducts) {
                                // Make a request to fetch products
                                const productList = await stripe.products.list({
                                    limit: 2,
                                    starting_after: startingAfterId,
                                })

                                for (const product of productList?.data || []) {
                                    const docToUpdate = await self.apos.doc.db.find({ 'productData.id': product.id }).next()
                                    console.log('-- -- -- -- -- -- -- -- -- -- -- -- -- -- --')
                                    /* console.log('-- -- product:', product)
                                    console.log('-- -- docToUpdate:', docToUpdate?.productData) */

                                    if (docToUpdate) {
                                        const difference = _.deepDiff(docToUpdate.productData, product)

                                        console.log('-- -- difference:', difference)

                                        // If there is a difference, update the document
                                        if (!_.isEmpty(difference)) {
                                            console.log('-- -- Difference found, updating the document')

                                            /* const update = await self.apos.doc.db.updateOne(
                                                { _id: docToUpdate._id },
                                                { $set: { 'productData': product } },
                                                { upsert: true }
                                            ) */

                                            differenceResults[docToUpdate._id] = { 'difference': difference }

                                            // console.log('-- -- update', update);
                                        } else {
                                            console.log('-- -- No difference found, skipping update')
                                        }
                                    }
                                    else {
                                        // if a record doesn't exist, insert a new one
                                        let stripeProductInstance = self.apos.stripeProduct.newInstance()
                                        stripeProductInstance.title = product.name
                                        stripeProductInstance.slug = self.apos.util.slugify(product.name)
                                        stripeProductInstance.productData = product

                                        console.log('-- -- API -- Stripe Products - Synchronize - product.id:', product.id)
                                        console.log('-- -- API -- Stripe Products - Synchronize - stripeProductInstance:', stripeProductInstance)

                                        const insert = await self.apos.stripeProduct.insert(req, stripeProductInstance)
                                        console.log('else - insert:', insert)
                                    }
                                }

                                // Update startingAfterId for the next request
                                if (productList.data.length > 0) {
                                    startingAfterId = productList.data[productList.data.length - 1].id
                                }

                                // Check if there are more products to fetch
                                hasMoreProducts = productList.has_more
                                console.log('-- -- hasMoreProducts:', hasMoreProducts)

                                // You can add your own condition to break out of the loop
                                // For example, break the loop if you have fetched a certain number of products
                                // or based on any other condition you need
                                if (!hasMoreProducts) {
                                    console.log('-- -- differenceResults:', differenceResults)
                                    reporting.setResults(differenceResults)
                                    reporting.success()
                                    break
                                }
                            }


                            // await delay(3000)

                            return true

                            const productList = await stripe.products.list({
                                limit: 1
                            })

                            console.log('productList:', productList)

                            productList?.data?.forEach(async product => {
                                const docsFound = await self.apos.doc.db.find({ slug: product.id }).toArray()

                                if (docsFound.length !== 0) {
                                    // if a record exists, update
                                    console.log('true - docsFound:', docsFound)

                                    /* docsFound.forEach(async doc => {
                                        // doc.test = 'test-3'

                                    }) */

                                    const update = await self.apos.doc.db.updateMany(
                                        { $or: docsFound },
                                        { $set: { test: 'test-3' } },
                                        { upsert: true })
                                }
                                else {
                                    // if a record doesn't exist, insert a new one
                                    let stripeProductInstance = self.apos.stripeProduct.newInstance()
                                    stripeProductInstance.slug = product.id
                                    stripeProductInstance.test = 'test-1'

                                    console.log('-- -- API -- Stripe Products - Synchronize - product.id:', product.id)
                                    console.log('-- -- API -- Stripe Products - Synchronize - stripeProductInstance:', stripeProductInstance)

                                    const insert = await self.apos.stripeProduct.insert(req, stripeProductInstance)
                                    console.log('else - insert:', insert)
                                }
                            })





                        },
                        {
                            action: 'synchronize-stripe-products',
                            ids: ['000']
                        }
                    )

                    // return req.res.redirect(303, checkoutSession.url)
                }
            }
        }
    }
}

// console.log('-- getBundleModuleNames', getBundleModuleNames())

function getBundleModuleNames() {
    return fs.readdirSync(path.resolve(__dirname, 'modules')).reduce((result, dir) => {
        if (dir.includes('stripe') && !(/\.[^/.]/g).test(dir)) {
            const subdirectories = fs.readdirSync(path.resolve(__dirname, `modules/${dir}`))
            subdirectories.forEach((subdir) => {
                if (!(/\.[^/.]/g).test(subdir)) {
                    result.push(`${dir}/${subdir}`)
                }
                else if (subdir === 'index.js') {
                    result.push(dir)
                }
            })
        }
        return result
    }, [])
}
