const fs = require('fs')
const path = require('path')

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

                    const productsList = await stripe.products.list({
                        limit: 25
                    })

                    console.log('productsList:', productsList)


                    async function delay(ms) {
                        // return await for better async stack trace support in case of errors.
                        return await new Promise(resolve => setTimeout(resolve, ms))
                    }

                    const ids = ['001', '002']

                    /* ids.forEach(id => {
                    }) */

                    return self.apos.modules['@apostrophecms/job'].runBatch(
                        req,
                        /* self.apos.task.getAdminReq, */
                        productsList.data,
                        async function (req, id) {

                            let checkoutSessionInstance = self.apos.stripeProduct.newInstance()
                            checkoutSessionInstance.slug = id
                            checkoutSessionInstance.test = 'test1'
                            console.log('-- -- API -- Stripe Products - Synchronize - id:', id)
                            console.log('-- -- API -- Stripe Products - Synchronize - checkoutSessionInstance:', checkoutSessionInstance)


                            // const command = await self.apos.stripeProduct.update(req, checkoutSessionInstance, { permissions: false })
                            /* {
                                                            permissions: false
                                                        } */
                            // const result = await self.apos.stripeProduct.find(req, { slug: id }).toObject()
                            const resultDocs = await self.apos.doc.db.find({ slug: id }).toArray() //.toObject()

                            if (resultDocs) {
                                // if a record exists, update
                                console.log('true - resultDocs:', resultDocs)

                                resultDocs.forEach(async doc => {
                                    // doc.test = 'test-3'

                                })

                                const update = await self.apos.doc.db.updateMany(
                                    { $or: resultDocs },
                                    { $set: { test: 'test-3' } },
                                    { upsert: true })

                                console.log('true - update:', update)
                            }
                            /* else {
                                // if a record doesn't exist, insert a new one
                                console.log('something else - result:', result)
                                const insert = await self.apos.stripeProduct.insert(req, checkoutSessionInstance)
                                console.log('something else - insert:', insert)
                            } */

                            await delay(1500)
                            /* const found = await self.apos.doc.find(req, {
                                _id: {
                                    $in: ids
                                }
                            }).project({ _id: 1 }).permission('edit').toArray() */

                            /* const piece = await self.findOneForEditing(req, { _id: id });

                            if (!piece) {
                              throw self.apos.error('notfound');
                            }

                            piece.archived = false;
                            await self.update(req, piece); */
                        }, {
                        /* permissions: false, */
                        action: 'test'
                    }
                    )

                    // return req.res.redirect(303, checkoutSession.url)
                }
            }
        }
    }
}

console.log('-- getBundleModuleNames', getBundleModuleNames())

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
