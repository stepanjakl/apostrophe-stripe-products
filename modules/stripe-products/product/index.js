module.exports = {
    extend: '@apostrophecms/piece-type',
    options: {
        alias: 'stripeProduct',
        label: 'Product',
        pluralLabel: 'Products',
        quickCreate: false,
        searchable: false,
        showCreate: false
    },
    batchOperations: {
        remove: ['publish']
    },
    utilityOperations(self) {
        return {
            add: {
                synchronizeProducts: {
                    label: 'stripeProducts:synchronizeProducts',
                    canEdit: true,
                    button: true,
                    // iconOnly: true,
                    // icon: 'dots-vertical-icon',
                    // type: 'outline'
                    eventOptions: {
                        event: 'synchronize-stripe-products'
                    }
                },
                /* test: {
                    label: 'AHOJ',
                    canEdit: true,
                    relationship: true,
                    label: {
                        key: 'TEST',
                        type: `$t(${self.options.label})`
                    },
                    eventOptions: {
                        event: 'edit',
                        type: self.__meta.name
                    }
                } */
            },
        }
    },
    columns: {
        add: {
            'stripeProductObject.name': {
                label: 'Product name',
                component: 'AposCellBasic'
            },
            'stripeProductObject.id': {
                label: 'Product ID',
                component: 'AposCellBasic'
            },
            'stripeProductObject.created': {
                label: 'Created',
                component: 'AposCellDate'
            },
            'stripeProductObject.updated': {
                label: 'Updated',
                component: 'AposCellDate'
            },
            /* 'amount_total': {
                label: 'Amount',
                component: 'AposCellBasic'
            },
            'currency': {
                label: 'Currency',
                component: 'AposCellBasic'
            },
            'line_items_quantity_total': {
                label: 'Quantity',
                component: 'AposCellBasic'
            },
            'checkoutSession.status': {
                label: 'Status',
                component: 'AposCellBasic'
            },
            'checkoutSession.payment_status': {
                label: 'Payment status',
                component: 'AposCellBasic'
            } */
        },
        remove: ['title', 'lastPublishedAt', 'updatedAt'],
        order: ['stripeProductObject.name', 'stripeProductObject.id', 'stripeProductObject.created', 'stripeProductObject.updated']
    },
    fields: {
        add: {
            stripeProductObject: {
                label: 'Stripe product object',
                type: 'object',
                fields: {
                    add: {
                        id: {
                            type: 'readOnly',
                            label: 'Product ID',
                            copyToClipboard: true,
                            openInNewTab: true,
                            openInNewTabPrepend: `${process.env.STRIPE_DASHBOARD_BASE_URL}${process.env.STRIPE_TEST ? '/test' : ''}/products/`
                        },
                        name: {
                            type: 'readOnly',
                            label: 'Name',
                            copyToClipboard: true
                        },
                        type: {
                            type: 'readOnly',
                            label: 'Type'
                        },
                        active: {
                            type: 'readOnly',
                            label: 'Active'
                        },
                        created: {
                            type: 'readOnly',
                            label: 'Created timestamp',
                            copyToClipboard: true
                        },
                        updated: {
                            type: 'readOnly',
                            label: 'Updated timestamp',
                            copyToClipboard: true
                        }
                    }
                }
            },
            stripePriceObject: {
                label: 'Stripe price object',
                type: 'object',
                fields: {
                    add: {
                        'id': {
                            type: 'readOnly',
                            label: 'Price ID',
                            copyToClipboard: true,
                            openInNewTab: true,
                            openInNewTabPrepend: `${process.env.STRIPE_DASHBOARD_BASE_URL}${process.env.STRIPE_TEST ? '/test' : ''}/prices/`
                        },
                        unit_amount: {
                            type: 'readOnly',
                            label: 'Unit amount',
                            copyToClipboard: true
                        },
                        currency: {
                            type: 'readOnly',
                            label: 'Currency'
                        },
                        type: {
                            type: 'readOnly',
                            label: 'Type'
                        }
                    }
                }
            }
        },
        remove: ['visibility'],
        group: {
            product: {
                label: 'Product',
                fields: [
                    'stripeProductObject'
                ]
            },
            price: {
                label: 'Price',
                fields: [
                    'stripePriceObject'
                ]
            },
            utility: {
                fields: [
                    'title',
                    'slug',
                ]
            }
        }
    },
    filters: {
        remove: ['visibility']
    },
    /* init(self) {
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
    }, */
    /* handlers(self, options) {
        return {
            'synchronizeProducts': {
                async fetchAndSaveStripeProducts() {
                    console.log('-- -- called synchronizeProducts');
                }
            }
        }
    } */
}
