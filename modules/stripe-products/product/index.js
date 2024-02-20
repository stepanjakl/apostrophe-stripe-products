module.exports = {
    extend: '@apostrophecms/piece-type',
    options: {
        alias: 'stripeProduct',
        label: 'Product',
        pluralLabel: 'Products',
        quickCreate: false,
        searchable: false,
        showCreate: false,
        publicApiProjection: {
            'stripeProductObject.id': 1,
            'stripeProductObject.name': 1
        }
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
                    /* modalOptions: {
                        title: 'stripeProducts:synchronizeProducts',
                        description: 'stripeProducts:synchronizeProductsUtilityConfirmation',
                        confirmationButton: 'stripeProducts:synchronizeProductsUtilityConfirmationButton'
                    },
                    messages: {
                        progress: 'stripeProducts:synchronizeProductsNotificationProgressMessage',
                        completed: 'stripeProducts:synchronizeProductsNotificationCompletedMessage'
                    }, */ // this only works for batchOperations unfortunately
                    eventOptions: {
                        event: 'synchronize-stripe-products'
                    }
                }
            }
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
            'stripeProductObject.created_timestamp': {
                label: 'Created',
                component: 'AposCellDate'
            },
            'stripeProductObject.updated_timestamp': {
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
        order: ['stripeProductObject.name', 'stripeProductObject.id', 'stripeProductObject.created_timestamp', 'stripeProductObject.updated_timestamp']
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
                            openInNewTabPrepend: `${process.env.STRIPE_DASHBOARD_BASE_URL}${process.env.STRIPE_TEST_MODE ? '/test' : ''}/products/`
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
                        created_timestamp: {
                            type: 'readOnly',
                            label: 'Created timestamp',
                            copyToClipboard: true
                        },
                        updated_timestamp: {
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
                        id: {
                            type: 'readOnly',
                            label: 'Price ID',
                            copyToClipboard: true,
                            openInNewTab: true,
                            openInNewTabPrepend: `${process.env.STRIPE_DASHBOARD_BASE_URL}${process.env.STRIPE_TEST_MODE ? '/test' : ''}/prices/`
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
    }
}
