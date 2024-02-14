const fs = require('fs')
const path = require('path')
const _ = require('lodash')

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

const Stripe = require('stripe')
const stripe = Stripe(process.env.STRIPE_KEY)

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
                    return self.apos.modules['@apostrophecms/job'].run(req, async (req, reporting) => {
                        // Set total for reporting
                        reporting.setTotal(Math.round(await self.apos.stripeProduct.find(req).toCount() / 2))
                        let differenceResults = {}
                        let startingAfterId

                        while (true) {
                            // Fetch products from Stripe
                            const productList = await stripe.products.list({ limit: 2, starting_after: startingAfterId })

                            for (const product of productList?.data || []) {
                                // Check if the document exists in the database
                                const docsToUpdate = await self.apos.doc.db.find({ 'stripeProductObject.id': product.id }).toArray()
                                let price = product.default_price ? await stripe.prices.retrieve(product.default_price) : null

                                if (product.default_price && price) {
                                    price.unit_amount = (price.unit_amount / 100).toFixed(2)
                                }

                                if (docsToUpdate.length > 0) {
                                    for (const docToUpdate of docsToUpdate) {
                                        // Calculate differences in product and price objects
                                        const differenceProductObject = _.deepDiff(docToUpdate.stripeProductObject, product)
                                        const differencePriceObject = product.default_price ? _.deepDiff(docToUpdate.stripePriceObject, price) : null

                                        // Update the document if differences are found
                                        if (!_.isEmpty(differenceProductObject) || !_.isEmpty(differencePriceObject)) {
                                            // Update the document with the new product and price objects
                                            await self.apos.doc.db.updateOne(
                                                { _id: docToUpdate._id },
                                                { $set: { 'stripeProductObject': product, 'stripePriceObject': price } },
                                                { upsert: true }
                                            )

                                            // Include 'difference' objects only if they are not empty
                                            if (!_.isEmpty(differenceProductObject)) {
                                                differenceResults[docToUpdate._id] = { 'stripeProductObject': { 'difference': differenceProductObject } }
                                            }
                                            if (!_.isEmpty(differencePriceObject)) {
                                                differenceResults[docToUpdate._id] = { 'stripePriceObject': { 'difference': differencePriceObject } }
                                            }
                                        }
                                    }
                                }
                                else {
                                    // Insert a new document if it doesn't exist
                                    let stripeProductInstance = self.apos.stripeProduct.newInstance()
                                    stripeProductInstance.title = product.name
                                    stripeProductInstance.slug = self.apos.util.slugify(product.name)
                                    stripeProductInstance.stripeProductObject = product
                                    stripeProductInstance.stripePriceObject = product.default_price ? price : null

                                    await self.apos.stripeProduct.insert(req, stripeProductInstance)
                                }
                            }

                            // Update startingAfterId for the next request
                            startingAfterId = productList.data.length > 0 ? productList.data[productList.data.length - 1].id : undefined

                            // Check if there are more products to fetch
                            if (!productList.has_more) {
                                // Finalize the job and pass doc changes to the results field
                                reporting.setResults(differenceResults)
                                reporting.success()
                                break
                            }
                        }
                    })
                }
            }
        }
    }
}

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
